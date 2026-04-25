locals {
  folder_id = "<идентификатор_каталога>"
}

terraform {
  required_providers {
    yandex = {
      source = "yandex-cloud/yandex"
    }
  }
  required_version = ">= 0.13"
}

provider "yandex" {
  zone = "ru-central1-a"
  folder_id = local.folder_id
}

resource "yandex_iam_service_account" "function_invoker_account" {
  name = "function-invoker-account"
}

resource "yandex_resourcemanager_folder_iam_member" "function_invoker_account_function_invoker" {
  folder_id = local.folder_id
  role      = "functions.functionInvoker"
  member    = "serviceAccount:${yandex_iam_service_account.function_invoker_account.id}"
}

resource "yandex_function" "event_function" {
    name = "event-function"
    runtime = "nodejs22"
    user_hash = filesha256("dist-event.zip")
    memory = "1024"
    entrypoint = "index.handler"
    execution_timeout  = "300"
    content {
        zip_filename = "./dist-event.zip"
    }
}

resource "yandex_function_trigger" "event_trigger" {
    name = "event-trigger"
    message_queue {
        queue_id = "<event_queue_id>"
        service_account_id = "<queues_service_account_id>"
        batch_size = "1"
        batch_cutoff = "10"
        visibility_timeout = 600
    }
    function {
        id = yandex_function.event_function.id
        tag = "$latest"
        service_account_id = "<queues_service_account_id>"
    }
}

resource "yandex_function" "event_request_function" {
    name = "event-request-function"
    runtime = "nodejs22"
    user_hash = filesha256("dist-event-request.zip")
    memory = "1024"
    entrypoint = "index.handler"
    execution_timeout  = "300"
    content {
        zip_filename = "./dist-event-request.zip"
    }
}

resource "yandex_function" "report_function" {
    name = "report-function"
    runtime = "nodejs22"
    user_hash = filesha256("dist.zip")
    memory = "1024"
    entrypoint = "index.handler"
    execution_timeout  = "300"
    content {
        zip_filename = "./dist.zip"
    }
}

resource "yandex_function_trigger" "report_trigger" {
    name = "report-trigger"
    message_queue {
        queue_id = "<report_queue_id>"
        service_account_id = "<queues_service_account_id>"
        batch_size = "1"
        batch_cutoff = "10"
        visibility_timeout = 600
    }
    function {
        id = yandex_function.report_function.id
        tag = "$latest"
        service_account_id = "<queues_service_account_id>"
    }
}

resource "yandex_function" "report_request_function_users" {
    name = "report-request-function-users"
    runtime = "nodejs22"
    user_hash = filesha256("dist-report-request.zip")
    memory = "1024"
    entrypoint = "index.handleUsersReport"
    execution_timeout  = "300"
    content {
        zip_filename = "./dist-report-request.zip"
    }
}

resource "yandex_function" "report_request_function_user" {
    name = "report-request-function-user"
    runtime = "nodejs22"
    user_hash = filesha256("dist-report-request.zip")
    memory = "1024"
    entrypoint = "index.handleUserReport"
    execution_timeout  = "300"
    content {
        zip_filename = "./dist-report-request.zip"
    }
}

resource "yandex_function" "report_request_function_events" {
    name = "report-request-function-events"
    runtime = "nodejs22"
    user_hash = filesha256("dist-report-request.zip")
    memory = "1024"
    entrypoint = "index.handleEventsReport"
    execution_timeout  = "300"
    content {
        zip_filename = "./dist-report-request.zip"
    }
}

resource "yandex_function" "report_request_function_event_types" {
    name = "report-request-function-event-types"
    runtime = "nodejs22"
    user_hash = filesha256("dist-report-request.zip")
    memory = "1024"
    entrypoint = "index.handleEventTypesReport"
    execution_timeout  = "300"
    content {
        zip_filename = "./dist-report-request.zip"
    }
}

resource "yandex_function" "archive_function" {
    name = "archive-function"
    runtime = "nodejs22"
    user_hash = filesha256("dist-archive.zip")
    memory = "1024"
    entrypoint = "index.handler"
    execution_timeout  = "300"
    content {
        zip_filename = "./dist-archive.zip"
    }
}

resource "yandex_function_trigger" "archive_trigger" {
    name = "archive-trigger"
    message_queue {
        queue_id = "<archive_queue_id>"
        service_account_id = "<queues_service_account_id>"
        batch_size = "1"
        batch_cutoff = "10"
        visibility_timeout = 600
    }
    function {
        id = yandex_function.archive_function.id
        tag = "$latest"
        service_account_id = "<queues_service_account_id>"
    }
}

resource "yandex_function" "archive_request_function" {
    name = "archive-request-function"
    runtime = "nodejs22"
    user_hash = filesha256("dist-archive-request.zip")
    memory = "1024"
    entrypoint = "index.handler"
    execution_timeout  = "300"
    content {
        zip_filename = "./dist-archive-request.zip"
    }
}

resource "yandex_api_gateway" "serverless_gateway" {
    name = "serverless-gateway"
    execution_timeout = "300"
    spec = <<-EOT
openapi: "3.0.0"
info:
  version: 1.0.0
  title: Serverless API
paths:
  /event:
    post:
        x-yc-apigateway-integration:
            payload_format_version: '0.1'
            function_id: ${yandex_function.event_request_function.id}
            tag: $latest
            type: cloud_functions
            service_account_id: ${yandex_iam_service_account.function_invoker_account.id}
  /report/users:
    post:
        x-yc-apigateway-integration:
            payload_format_version: '0.1'
            function_id: ${yandex_function.report_request_function_users.id}
            tag: $latest
            type: cloud_functions
            service_account_id: ${yandex_iam_service_account.function_invoker_account.id}
  /report/user:
    post:
        x-yc-apigateway-integration:
            payload_format_version: '0.1'
            function_id: ${yandex_function.report_request_function_user.id}
            tag: $latest
            type: cloud_functions
            service_account_id: ${yandex_iam_service_account.function_invoker_account.id}
  /report/events:
    post:
        x-yc-apigateway-integration:
            payload_format_version: '0.1'
            function_id: ${yandex_function.report_request_function_events.id}
            tag: $latest
            type: cloud_functions
            service_account_id: ${yandex_iam_service_account.function_invoker_account.id}
  /report/eventTypes:
    post:
        x-yc-apigateway-integration:
            payload_format_version: '0.1'
            function_id: ${yandex_function.report_request_function_event_types.id}
            tag: $latest
            type: cloud_functions
            service_account_id: ${yandex_iam_service_account.function_invoker_account.id}
  /archive/events:
    post:
        x-yc-apigateway-integration:
            payload_format_version: '0.1'
            function_id: ${yandex_function.archive_request_function.id}
            tag: $latest
            type: cloud_functions
            service_account_id: ${yandex_iam_service_account.function_invoker_account.id}
EOT
}

output "serverless_gateway" {
    value = {
        domain = yandex_api_gateway.serverless_gateway.domain
    }
}
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
}

resource "yandex_function" "report_function" {
    name = "report-function"
    runtime = "nodejs22"
    user_hash = filesha256("dist.zip")
    memory = "8192"
    entrypoint = "index.handler"
    execution_timeout  = "600"
    concurrency = "16"
    content {
        zip_filename = "./dist.zip"
    }
}

resource "yandex_function_trigger" "report_trigger" {
    name = "report-trigger"
    message_queue {
        queue_id = "<report_queue_id>"
        service_account_id = "<queues_service_account_id>"
        batch_size = "100"
        batch_cutoff = "1"
        visibility_timeout = 600
    }
    function {
        id = yandex_function.report_function.id
        tag = "$latest"
        service_account_id = "<queues_service_account_id>"
    }
}

resource "yandex_function" "archive_function" {
    name = "archive-function"
    runtime = "nodejs22"
    user_hash = filesha256("dist-archive.zip")
    memory = "8192"
    entrypoint = "index.handler"
    execution_timeout  = "600"
    concurrency = "16"
    content {
        zip_filename = "./dist-archive.zip"
    }
}

resource "yandex_function_trigger" "archive_trigger" {
    name = "archive-trigger"
    message_queue {
        queue_id = "<archive_queue_id>"
        service_account_id = "<queues_service_account_id>"
        batch_size = "10"
        batch_cutoff = "1"
        visibility_timeout = 600
    }
    function {
        id = yandex_function.archive_function.id
        tag = "$latest"
        service_account_id = "<queues_service_account_id>"
    }
}
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
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

resource "yandex_vpc_network" "network-1" {
  name = "network1"
}

resource "yandex_vpc_subnet" "subnet-1" {
  name           = "subnet1"
  zone           = "ru-central1-a"
  network_id     = yandex_vpc_network.network-1.id
  v4_cidr_blocks = ["192.168.10.0/24"]
}

data "yandex_compute_image" "container-optimized-image" {
  family = "container-optimized-image"
}

resource "yandex_container_registry" "container-registry" {
  name = "container-registry"
}

resource "yandex_mdb_mongodb_cluster" "mongo-cluster" {
  name        = "mongo-cluster"
  environment = "PRESTABLE"
  network_id  = yandex_vpc_network.network-1.id

  cluster_config {
    version = "7.0"
  }

  host {
    zone_id          = "ru-central1-a"
    subnet_id        = yandex_vpc_subnet.subnet-1.id
    assign_public_ip = true
  }

  resources_mongod {
    resource_preset_id = "s2.micro"
    disk_type_id       = "network-ssd"
    disk_size          = 16
  }
}

resource "yandex_mdb_mongodb_database" "mongo-db-events" {
  cluster_id = yandex_mdb_mongodb_cluster.mongo-cluster.id
  name       = "events"
}

resource "yandex_mdb_mongodb_user" "mongo-user-events" {
  cluster_id = yandex_mdb_mongodb_cluster.mongo-cluster.id
  name       = "events-user"
  password   = "events-password"

  permission {
    database_name = yandex_mdb_mongodb_database.mongo-db-events.name
    roles         = ["readWrite"]
  }
}

resource "yandex_storage_bucket" "bucket-1" {
  bucket = "unique-bucket-name-1"

  anonymous_access_flags {
    read = true
  }
}

resource "yandex_compute_instance" "vm-1" {
  name = "container-optimized-image-instance"

  boot_disk {
    initialize_params {
      image_id = data.yandex_compute_image.container-optimized-image.id
    }
  }
  network_interface {
    subnet_id = yandex_vpc_subnet.subnet-1.id
    nat       = true
  }
  resources {
    cores  = 2
    memory = 2
  }
  metadata = {
    docker-container-declaration = file("./declaration.yml")
    user-data                    = file("./cloud-config.yml")
  }
}

resource "yandex_iam_service_account" "queues_service_account" {
  name = "queues-service-account"
}

resource "yandex_resourcemanager_folder_iam_member" "queues_service_account_editor" {
  folder_id = local.folder_id
  role      = "editor"
  member    = "serviceAccount:${yandex_iam_service_account.queues_service_account.id}"
}

resource "yandex_iam_service_account_static_access_key" "queues_service_account_static_key" {
  service_account_id = yandex_iam_service_account.queues_service_account.id
  description        = "static access key for message queue"
}

resource "yandex_message_queue" "report_queue_request" {
  name = "report_queue_request"
  visibility_timeout_seconds = 600
  receive_wait_time_seconds  = 20
  message_retention_seconds  = 1209600
  redrive_policy = jsonencode({
    deadLetterTargetArn = yandex_message_queue.report_deadletter_queue_request.arn
    maxReceiveCount     = 3
  })

  access_key = yandex_iam_service_account_static_access_key.queues_service_account_static_key.access_key
  secret_key = yandex_iam_service_account_static_access_key.queues_service_account_static_key.secret_key
  depends_on = [ yandex_resourcemanager_folder_iam_member.queues_service_account_editor ]
}

resource "yandex_message_queue" "report_deadletter_queue_request" {
  name = "report_deadletter_queue_request"

  access_key = yandex_iam_service_account_static_access_key.queues_service_account_static_key.access_key
  secret_key = yandex_iam_service_account_static_access_key.queues_service_account_static_key.secret_key
  depends_on = [ yandex_resourcemanager_folder_iam_member.queues_service_account_editor ]
}

resource "yandex_message_queue" "report_queue_response" {
  name = "report_queue_response"
  visibility_timeout_seconds = 600
  receive_wait_time_seconds  = 20
  message_retention_seconds  = 1209600
  redrive_policy = jsonencode({
    deadLetterTargetArn = yandex_message_queue.report_deadletter_queue_response.arn
    maxReceiveCount     = 3
  })

  access_key = yandex_iam_service_account_static_access_key.queues_service_account_static_key.access_key
  secret_key = yandex_iam_service_account_static_access_key.queues_service_account_static_key.secret_key
  depends_on = [ yandex_resourcemanager_folder_iam_member.queues_service_account_editor ]
}

resource "yandex_message_queue" "report_deadletter_queue_response" {
  name = "report_deadletter_queue_response"

  access_key = yandex_iam_service_account_static_access_key.queues_service_account_static_key.access_key
  secret_key = yandex_iam_service_account_static_access_key.queues_service_account_static_key.secret_key
  depends_on = [ yandex_resourcemanager_folder_iam_member.queues_service_account_editor ]
}

output "container-optimized-image" {
  description = "Container optimized image"
  value = {
    internal_ip = yandex_compute_instance.vm-1.network_interface.0.ip_address
    external_ip = yandex_compute_instance.vm-1.network_interface.0.nat_ip_address
  }
}

output "container-registry" {
  description = "Container registry"
  value = {
    registry_id = yandex_container_registry.container-registry.registry_id
  }
}

output "mongo-events" {
  description = "Mongo events db"
  value = {
    name = yandex_mdb_mongodb_cluster.mongo-cluster.host[0].name
  }
}

output "report-queue-request-url" {
  value = {
    url = yandex_message_queue.report_queue_request.id
    arn = yandex_message_queue.report_queue_request.arn
  }
}

output "report-queue-response-url" {
  value = {
    url = yandex_message_queue.report_queue_response.id
    arn = yandex_message_queue.report_queue_response.arn
  }
}

output "queues-service-account" {
  value = {
    id = yandex_iam_service_account.queues_service_account.id
    access_key = nonsensitive(yandex_iam_service_account_static_access_key.queues_service_account_static_key.access_key)
    secret_key = nonsensitive(yandex_iam_service_account_static_access_key.queues_service_account_static_key.secret_key)
  }
}
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

output "container-optimized-image" {
  description = "Адреса container optimized image"
  value = {
    internal_ip = yandex_compute_instance.vm-1.network_interface.0.ip_address
    external_ip = yandex_compute_instance.vm-1.network_interface.0.nat_ip_address
  }
}

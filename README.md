# Экспериментальная система в рамках исследования serverless технологий

## Начало работы

Установите npm зависимости при помощи команды `npm ci`

## Yandex Cloud

### Yandex Cloud IaaC

Подробная инструкция по началу работы с Terraform [представлена по ссылке](https://yandex.cloud/ru/docs/terraform/quickstart)
Также понадобится [Yandex Cloud CLI](https://yandex.cloud/ru/docs/cli/quickstart#install)

#### Краткая инструкция для Windows 11

1. Необходимо сгенерировать публичный SSH ключ (если генерировали его ранее, то обычно он находится по пути ~/.ssh/id_ed25519.pub)
2. Перейдите в директорию с конфигурацией Terraform: `cd .\infrastructure\terraform\`
3. При помощи команды `yc init` создайте профиль для управления каталогом
4. В Yandex Cloud необходимо создать сервисный аккаунт с ролью в каталоге `editor`
5. Создайте ключ авторизации: `yc iam key create --service-account-id <идентификатор_сервисного_аккаунта> --folder-name <имя_каталога_с_сервисным_аккаунтом> --output key.json`
6. Создайте профиль CLI для выполнения операций от имени сервисного аккаунта: `yc config profile create <имя_профиля>`
7. Задайте конфигурацию профиля (идентификатор облака и каталога находятся рядом с их названиями в [консоли](https://console.yandex.cloud/) если перейти на их страницу)

```Bash
yc config set service-account-key key.json
yc config set cloud-id <идентификатор_облака>
yc config set folder-id <идентификатор_каталога>
```

8. Добавьте данные аутентификации в переменные окружения

```Bash
$Env:YC_TOKEN=$(yc iam create-token)
$Env:YC_CLOUD_ID=$(yc config get cloud-id)
$Env:YC_FOLDER_ID=$(yc config get folder-id)
```

9. Создайте файл `terraform.rc` в `%APPDATA%`, добавьте в него следующее содержимое

```
provider_installation {
  network_mirror {
    url = "https://terraform-mirror.yandexcloud.net/"
    include = ["registry.terraform.io/*/*"]
  }
  direct {
    exclude = ["registry.terraform.io/*/*"]
  }
}
```

10. Инициализируйте Terraform

```Bash
terraform providers lock -net-mirror=https://terraform-mirror.yandexcloud.net -platform=windows_amd64 yandex-cloud/yandex
terraform init
```

11. Скопируйте файл `cloud-config.example.yml` и переименуйте копию в `cloud-config.yml`, вставьте свой публичный ssh ключ в соответствующую строку, а также задайте имя пользователя в поле `name` (обычно ваше имя пользователя написано в конце публичного ключа: `<имя_пользователя>@<имя_устройства>`)
12. Скопируйте файл `declaration.example.yml` и переименуйте копию в `declaration.yml` (его редактирование будет позже)
13. Выполните команду `terraform apply` для первоначального развертывания инфраструктуры
14. Перейдите В [console.yandex.cloud](https://console.yandex.cloud/)
15. Создайте сервисный аккаунт и назначьте ему роль `container-registry.images.puller` для развернутого Container Registry (Container Registry -> container-registry -> Права доступа -> Назначить роли) и укажите его в качестве сервисного аккаунта Container Optimized Image (Compute Cloud -> ВМ Container Optimized Image -> Изменить ВМ -> Дополнительно -> Сервисный аккаунт)
16. Соберите Docker-образ [монолитной версии системы для развертывания на платформе Yandex Cloud](#сборка-docker-image-монолитной-версии-системы-для-развертывания-на-платформе-yandex-cloud)
17. Опубликуйте Docker-образ по инструкции из раздела [Отправка Docker image в Yandex Cloud Container Registry](#отправка-docker-image)
18. В файле `declaration.yml` введите название опубликованного Docker-образа
19. Выполните команду `terraform apply` для обновления конфигурации инфраструктуры, в терминале будут выведены IP-адреса виртуальной машины
20. Проверьте работу приложения, при помощи `http://<external_ip>:3000/ping`

#### Удаление созданных ресурсов

Для удаления созданных ресурсов используйте команду `terraform destroy`. Возможно понадобится ручное удаление Docker-image из Container Registry.

### Container Optimized Image

Монолитная часть системы разворачивается внутри виртуальной машины [Container Optimized Image](https://yandex.cloud/ru/docs/cos/quickstart)

#### Просмотр логов запуска Docker-образов

Для этого авторизуйтесь в виртуальной машине по SSH и введите команду: `sudo journalctl -eu yc-container-daemon`

### Yandex Cloud Container Registry

#### Начало работы

[Аутентифицируйтесь](https://yandex.cloud/ru/docs/container-registry/operations/authentication) в реестре Yandex Cloud Container Registry по инструкции

#### Сборка Docker image монолитной версии системы для развертывания на платформе Yandex Cloud

1. Разверните инфраструктуру Yandex Cloud по [инструкции выше](#yandex-cloud-iaac)
2. Создайте сервисный аккаунт в Identity and Access Managements и настройте его для управления Object Storage: выдайте ему роли `kms.keys.encrypterDecrypter`, `kms.keys.user`, `storage.editor` на странице Object Storage -> Бакеты -> <название_бакета> -> Безопасность -> Назначить роли
3. Создайте файл `.env.yandex.local` в директории `/packages/monolith` и заполните его следующими данными

```Shell
EVENTS_STORAGE_MONGO_HOSTS=<адрес_хоста>:<порт> # можно найти в Managed Service for MongoDB -> Кластеры -> mongo-cluster -> Базы данных -> events -> Подключиться

# необходимо получить для сервисного аккаунта с доступом к объектному хранилищу (Identity and Access Management -> Сервисные аккаунты -> аккаунт -> Создать новый ключ -> Создать статический ключ доступа)
ARCHIVE_STORAGE_YS3_ACCESS_KEY_ID=<access_key_id>
ARCHIVE_STORAGE_YS3_SECRET_ACCESS_KEY=<secret_access_key_id>
```

#### Отправка Docker image

1. собираем образ `docker build -f .\Dockerfile.monolith.release.yandex -t cr.yandex/<Идентификатор регистра>/analytics:1.0.0 .`
2. отправляем в регистр `docker push cr.yandex/<Идентификатор регистра>/analytics:1.0.0`

Подробная инструкция [здесь](https://yandex.cloud/ru/docs/container-registry/operations/docker-image/docker-image-push)

#### Решение проблем

Если по каким-то причинам не удалось проверить работоспособность системы, то можно попробовать зайти по ssh в виртуальную машину и проверить состояние демона, управляющего запуском контейнеров: `sudo journalctl -eu yc-container-daemon`

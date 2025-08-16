# Экспериментальная система в рамках исследования serverless технологий

## Отправка docker image в Yandex Cloud Container Registry

1. [аутентифицироваться](https://yandex.cloud/ru/docs/container-registry/operations/authentication) в реестре
2. собираем образ `docker build -f .\Dockerfile.monolith.release.yandex -t cr.yandex/<Идентификатор регистра>/analytics:1.0.3 .`
3. отправляем в регистр `docker push cr.yandex/<Идентификатор регистра>/analytics:1.0.3`

Подробная инструкция [здесь](https://yandex.cloud/ru/docs/container-registry/operations/docker-image/docker-image-push)

## Yandex Cloud IaaC

Подробная инструкция по началу работы с Terraform [представлена по ссылке](https://yandex.cloud/ru/docs/terraform/quickstart)
Также понадобится [Yandex Cloud CLI](https://yandex.cloud/ru/docs/cli/quickstart#install)

### Краткая инструкция для Windows 11

1. Необходимо сгенерировать публичный SSH ключ (должен располагаться по пути ~/.ssh/id_ed25519.pub)
2. В Yandex Cloud необходимо создать сервисный аккаунт с ролью в каталоге `editor`
3. Создайте ключ авторизации: `yc iam key create --service-account-id <идентификатор_сервисного_аккаунта> --folder-name <имя_каталога_с_сервисным_аккаунтом> --output key.json`
4. Создайте профиль CLI для выполнения операций от имени сервисного аккаунта: `yc config profile create <имя_профиля>`
5. Задайте конфигурацию профиля

```Bash
yc config set service-account-key key.json
yc config set cloud-id <идентификатор_облака>
yc config set folder-id <идентификатор_каталога>
```

6. Добавьте данные аутентификации в переменные окружения

```Bash
$Env:YC_TOKEN=$(yc iam create-token)
$Env:YC_CLOUD_ID=$(yc config get cloud-id)
$Env:YC_FOLDER_ID=$(yc config get folder-id)
```

7. Создайте файл `terraform.rc` в `%APPDATA%`, добавьте в него следующее содержимое

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

8. Перейдите в директорию с конфигурацией Terraform: `cd .\infrastructure\terraform\`
9. Инициализируйте Terraform

```Bash
terraform providers lock -net-mirror=https://terraform-mirror.yandexcloud.net -platform=windows_amd64 yandex-cloud/yandex
terraform init
```

10. Скопируйте файл `cloud-config.example.yml` и переименуйте копию в `cloud-config.yml`, вставьте свой публичный ssh ключ в соответствующую строку
11. Скопируйте файл `declaration.example.yml` и переименуйте копию в `declaration.yml` (его редактирование будет позже)
12. Выполните команду `terraform apply` для первоначального развертывания инфраструктуры
13. Перейдите В [console.yandex.cloud](https://console.yandex.cloud/)
14. Создайте сервисный аккаунт и назначьте ему роль `container-registry.images.puller` для развернутого регистра Docker image и укажите его в качестве сервисного аккаунта Container Optimized Image (Изменить -> Дополнительно -> Сервисный аккаунт)
15. Опубликуйте Docker-образ по инструкции из раздела [Отправка docker image в Yandex Cloud Container Registry](#отправка-docker-image-в-yandex-cloud-container-registry)
16. В файле `declaration.example.yml` введите название опубликованного Docker-образа
17. Выполните команду `terraform apply` для обновления конфигурации инфраструктуры, в терминале будут выведены IP-адреса виртуальной машины
18. Проверьте работу приложения, при помощи `http://<external_ip>:3000/ping`

### Удаление созданных ресурсов

Для удаления созданных ресурсов используйте команду `terraform destroy`

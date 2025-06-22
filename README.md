## Отправка docker image в Yandex Cloud Container Registry

1. [аутентифицироваться](https://yandex.cloud/ru/docs/container-registry/operations/authentication) в реестре
2. собираем образ `docker build -f .\Dockerfile.monolith.release.yandex -t cr.yandex/<Идентификатор регистра>/analytics:1.0.3 .`
3. отправляем в регистр `docker push cr.yandex/<Идентификатор регистра>/analytics:1.0.3`

Подробная инструкция [здесь](https://yandex.cloud/ru/docs/container-registry/operations/docker-image/docker-image-push)

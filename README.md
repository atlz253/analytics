# Экспериментальная система в рамках исследования serverless технологий

## Начало работы

Установите npm зависимости при помощи команды `npm ci`

## Инфраструктура

Развертывание инфраструктуры производится при помощи скрипта автоматизации развертывания, который запускается в среде Docker:

1. соберите Docker image с скриптом автоматизации `docker build -f docker/Dockerfile.autodeploy -t autodeploy .`
2. запустите Docker-контейнер и следуйте пошаговым инструкциям скрипта автоматизации `docker run --name autodeploy -v //var/run/docker.sock:/var/run/docker.sock -it autodeploy`

Для последующего управления инфраструктурой перезапустите контейнер командой `docker start -i autodeploy`

### Свертывание инфраструктуры

Для свертывания инфраструктуры запустите контейнер командой `docker start -i autodeploy` и выберите пункт `Свернуть инфраструктуру`

### Дополнительные настройки окружения Docker image

Также вы можете указать переменные окружения в файле `./infrastructure/autodeploy/.env.local`, что позволит пропускать повторную инициализацию при пересоздании контейнера:

1. Скопируйте файл `./infrastructure/autodeploy/.env.example` в ту же директорию и переименуйте его в `.env.local`
2. В файле `.env.local` заполните переменные соответствующими данными
3. При запуске контейнера монтируйте `.env.local` при помощи команды `docker run --name autodeploy -v ./infrastructure/autodeploy/.env.local:/app/.env -v //var/run/docker.sock:/var/run/docker.sock -it autodeploy`

@echo off
chcp 65001
setlocal

:: --- 可配置变量 ---
:: 请根据您的项目和 Docker Hub 账户修改这些变量
set DOCKER_HUB_USERNAME=sbaoor
set IMAGE_NAME=mc-status-app
set IMAGE_VERSION=latest

:: --- 本地运行容器的变量 (可选) ---
set CONTAINER_NAME=mc-status-web
set EXTERNAL_PORT=8080
set INTERNAL_PORT=3000


:: --- 脚本开始 ---
:: 组合完整的远程镜像名称
set "REMOTE_IMAGE_NAME=%DOCKER_HUB_USERNAME%/%IMAGE_NAME%:%IMAGE_VERSION%"

echo ===== 开始构建并上传 Docker 镜像 =====
echo 目标镜像: %REMOTE_IMAGE_NAME%
echo.

:: 1. 构建新的 Docker 镜像
echo --^> 步骤 1/3: 正在构建本地镜像: %IMAGE_NAME%...
docker build -t %IMAGE_NAME% .

:: 检查构建是否成功
if %errorlevel% neq 0 (
    echo ===== X Docker 镜像构建失败 =====
    exit /b 1
)
echo --^> 本地镜像构建成功！
echo.

:: 2. 给镜像打上远程仓库的标签
echo --^> 步骤 2/3: 正在标记镜像为 %REMOTE_IMAGE_NAME%...
docker tag %IMAGE_NAME% %REMOTE_IMAGE_NAME%
if %errorlevel% neq 0 (
    echo ===== X 镜像标记失败 =====
    exit /b 1
)
echo --^> 镜像标记成功！
echo.

:: 3. 推送镜像到 Docker Hub
echo --^> 步骤 3/3: 正在推送镜像到 Docker Hub...
echo     (在执行此脚本前，请确保您已通过 'docker login' 命令登录)
docker push %REMOTE_IMAGE_NAME%

:: 检查推送是否成功
if %errorlevel% neq 0 (
    echo ===== X 镜像推送失败，请检查登录状态和仓库权限 =====
    exit /b 1
)
echo --^> 镜像推送成功！
echo.

echo.
echo ===== V 部署成功！ =====
echo 镜像已成功上传到 Docker Hub。
echo 您的应用正在本地后台运行。


endlocal
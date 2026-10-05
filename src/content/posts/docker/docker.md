---
title: 如何把本地的项目部署成docker应用
published: 2025-12-15
updated: 2025-12-15
description: '本文演示把本地的项目打包成docker应用并部署到服务器运行'
image: ''
tags: [Docker]
category: 'Docker'
draft: false
---
:::important  
确保docker desktop 处于打开状态   
:::
# 1. 编写Dockerfile
在你的项目根目录下创建一个名为 `Dockerfile` 的文件，并添加以下内容：
:::note  
以meting的项目为例
:::

```Docker
#使用官方的node.js作为基础镜像
FROM node:23-alpine3.20

#设置工作目录
WORKDIR /app #将/app作为后续指令的默认目录
COPY . /app  #复制文件，将本地的项目文件都复制到/app目录下

#构建参数 声明可以在构建时传入的参数
ARG UID #用户ID
ARG GID #组ID
ARG PORT #端口

#环境变量 设置环境变量的默认值
ENV UID=${UID:-1010}
ENV GID=${GID:-1010}
ENV PORT=${PORT:-3000}

#创建一个非root用户来运行应用程序，保证系统安全
RUN addgroup -g ${GID} --system meting \
    && adduser -G meting --system -D -s /bin/sh -u ${UID} meting

#安装项目依赖
RUN npm i

#更改/app目录的所有权为meting用户
#chown 更改所有权
RUN chown -R meting:meting /app

#切换到meting用户（为了系统安全）
USER meting

#暴露应用程序端口 声明容器内的应用要监听哪个端口
EXPOSE ${PORT}

#启动应用程序的命令
CMD ["node", "/app/node.js"]

```
# 2. 构建Docker镜像
在终端中导航到项目根目录，然后运行以下命令来构建Docker镜像：
:::note  
注意不要忘了最后的 .
:::
```bash
docker build -t meting:2.0 .
#docker 构建镜像 名为meting 版本2.0 
```
# 3. 保存docker到本地
运行以下命令将镜像保存为一个tar文件：

```bash
docker save -o meting2.tar meting:2.0
#docker 保存镜像到本地 -o 指定输出文件名 meting2 镜像名 meting 版本2.0
```
![保存到本地](1.png)
# 4. 将tar文件上传到服务器
**使用宝塔面板，将tar文件上传到服务器的某个位置**
# 5. 在服务器上加载Docker镜像
![加载镜像](7.png)
![加载镜像](5.png)
:::note  
找到刚刚上传的tar文件
:::
![加载镜像](4.png)
:::note  
创建容器
:::
![加载镜像](3.png)
![加载镜像](6.png)
# 恭喜你，运行成功

---
title: 使用vscode连接远程服务器进行yolo训练
published: 2026-06-15
updated: 2026-06-15
description: '详细教程：如何使用 VS Code Remote-SSH 插件连接远程服务器，配置 YOLO 训练环境，并通过 FileZilla、SCP、Termius 等方法传输数据与模型文件。'
image: 'https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/06/15/6a2fa3fc4e2dd.png'
tags: [VS Code, SSH, YOLO, 远程开发, 深度学习, 服务器配置, 数据传输]
category: 'General'
draft: false
---

# 使用 VS Code 连接远程服务器进行 YOLO 训练

在深度学习开发中，经常需要在拥有 GPU 的远程服务器上训练模型。本地编辑代码、远程运行脚本是高效的工作流。本文将手把手教你如何用 VS Code 的 Remote-SSH 插件连接远程服务器，配置 Ultralytics YOLO 环境，并解决数据传输和依赖安装的常见坑。

## 1. 安装 VS Code Remote-SSH 插件

打开 VS Code 的扩展商店（快捷键 `Ctrl+Shift+X`），搜索 **Remote - SSH**，点击安装。该插件由微软官方出品，稳定性极佳。

![Remote-SSH 插件安装界面](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/06/15/6a2f94daa5121.png)

安装完成后，VS Code 左下角会显示一个远程连接图标（类似 `><`）。

## 2. 配置 SSH 连接信息

你可以在 VS Code 中直接管理 SSH 配置文件，也可以手动编辑 `~/.ssh/config`。

### 方法一：通过 VS Code 命令面板配置

- 按 `F1` 或 `Ctrl+Shift+P`，输入 `Remote-SSH: Open SSH Configuration File...`，选择用户级配置文件（通常是 `~/.ssh/config`）。
- 在文件中添加如下主机配置：

```ssh-config
Host my-gpu-server
    HostName 192.168.1.100
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa
```

### 方法二：直接修改本地配置文件

- 通过系统终端编辑 `~/.ssh/config`（Windows 路径为 `C:\Users\你的用户名\.ssh\config`）。
- 示例配置（适配大部分云服务器）：

```ssh-config
Host aliyun-gpu
    HostName 39.106.xx.xx
    User ubuntu
    Port 22
    IdentityFile C:\Users\admin\.ssh\aliyun.pem
```

![SSH 配置示例](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/06/15/6a2f9512cc187.png)

![VS Code 中配置界面](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/06/15/6a2f951d05923.png)

> [!TIP]
> 如果使用密钥登录，请确保私钥文件权限为 600（Linux/Mac）或仅为当前用户可读（Windows）。

## 3. 连接远程服务器

- 点击 VS Code 左下角的 `><` 图标，选择 **Remote-SSH: Connect to Host...**。
- 选择刚刚配置的主机名（如 `aliyun-gpu`）。
- 等待连接成功，输入密码或确认密钥指纹（首次连接会提示）。

![选择远程主机](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/06/15/6a2f95364fc99.png)

连接成功后，VS Code 会在新窗口中打开。点击左侧活动栏的 **打开文件夹** 图标，选择服务器上的项目目录（例如 `/home/ubuntu/yolo-project`）。此时你就能像操作本地文件一样编辑远程代码了，终端也会自动连接到远程服务器。

![打开远程文件夹](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/06/15/6a2f979ec621c.png)

## 4. 数据传输：将数据集和代码传送到服务器

训练 YOLO 需要大量数据集和预训练权重，下面提供三种主流传输方式。

### 4.1 使用 FileZilla（支持 FTP/SFTP）

- 下载 [FileZilla](https://filezilla-project.org/) 并安装。
- 在顶部配置主机、端口、用户名、密码（或密钥），协议选择 SFTP。

![FileZilla 配置界面](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/06/15/6a2f96486da53.png)

- 连接成功后，左侧为本地目录，右侧为远程目录。直接拖拽文件夹即可上传。

![FileZilla 拖拽上传](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/06/15/6a2f96c00726e.png)

### 4.2 使用 SCP 命令（适用于仅支持 SSH 的主机）

很多云主机（如英博云）没有启用 SFTP 服务，只能通过 SCP 传输文件。你可以使用以下命令：

```bash
# 上传文件至容器实例
scp -P 35832 ./notes.txt root@ssh-cn-huabei1.ebcloud.com:/data/

# 从容器实例下载文件
scp -P 35832 root@ssh-cn-huabei1.ebcloud.com:/data/notes.txt ./notes_copy.txt
```

如果传输整个目录，加上 `-r` 参数：

```bash
scp -P 35832 -r ./datasets/ root@ssh-cn-huabei1.ebcloud.com:/data/
```

### 4.3 使用 Termius 图形化传输（推荐新手）

[Termius](https://termius.com/) 是一款跨平台的 SSH 客户端，支持图形化文件浏览。直接拖拽文件到指定目录即可，非常直观。

![Termius 文件传输界面](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/06/15/6a2f9b9d5ab9c.png)

## 5. 配置深度学习环境

大多数 GPU 服务器在购买时已经预装了 PyTorch 和 CUDA 环境。你只需要确认 CUDA 版本与 PyTorch 匹配即可。我们主要关注如何在虚拟环境中安装 Ultralytics 库。

### 5.1 创建 Conda 虚拟环境

```bash
conda create -n yolo python=3.10
conda activate yolo
```

### 5.2 将 Ultralytics 库上传到服务器

你可以直接从 PyPI 安装，但为了版本控制和避免依赖冲突，推荐下载源码包后离线安装。

- 从 [GitHub Releases](https://github.com/ultralytics/ultralytics/releases) 或 `pip download ultralytics==8.1.0` 获取 `.tar.gz` 或 `.whl` 文件。
- 通过 FileZilla 或 SCP 上传到服务器，例如放到 `/data/ultralytics-8.1.0/`。

![小权上传的 Ultralytics 库文件夹](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/06/15/6a2f99b91f3a1.png)

### 5.3 安装 Ultralytics（关键步骤）

```bash
pip install /data/ultralytics-8.1.0/ --no-deps
```

> :::warning 必读：使用 `--no-deps` 的原因
> 如果不加 `--no-deps`，pip 可能会尝试安装或升级 PyTorch、torchvision 等依赖包，从而与服务器预装的 CUDA 版本不匹配，导致 GPU 无法识别。**一定要指定 `--no-deps`**，让 Ultralytics 直接使用环境中已有的 PyTorch。
> :::

如果你不小心忘了加 `--no-deps`，导致 PyTorch 被替换，可以执行以下恢复：

```bash
# 1. 查看当前 PyTorch 版本和 CUDA 版本
python -c "import torch; print(torch.__version__); print(torch.version.cuda)"

# 2. 按照服务器实际的 CUDA 版本重新安装 PyTorch（例如 CUDA 11.8）
pip install torch==2.1.0 torchvision==0.16.0 --index-url https://download.pytorch.org/whl/cu118
```

### 5.4 安装 OpenCV 依赖（无图形界面环境）

在纯命令行服务器上运行 YOLO 时，OpenCV 会报错缺少 `libGL.so.1`。执行以下命令安装依赖：

```bash
sudo apt update && sudo apt install -y libgl1-mesa-glx
```

> [!NOTE]
> 如果你的服务器是 Ubuntu 22.04 及以上版本，可能需要安装 `libgl1-mesa-dri` 或 `libglib2.0-0`，建议一次性安装：
> ```bash
> sudo apt install -y libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev
> ```

## 6. 运行 YOLO 训练

一切就绪后，在 VS Code 终端中激活环境并执行训练命令：

```bash
conda activate yolo
yolo train data=coco128.yaml model=yolov8n.pt epochs=100 imgsz=640 device=0
```

你也可以通过 VS Code 的 Python 交互式窗口进行调试，就像在本地开发一样便捷。

## 常见问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| SSH 连接超时 | 端口未开放/防火墙阻挡 | 检查云服务器安全组是否放行22端口 |
| `libGL.so.1` 错误 | 无图形系统缺少OpenCV依赖 | 按上文 `apt install libgl1-mesa-glx` |
| CUDA 不可用 | PyTorch版本与驱动不匹配 | 用 `nvidia-smi` 查看CUDA版本，重新安装对应PyTorch |
| 权限不足 | 文件所有权问题 | 使用 `chmod -R 755 /path` 或 `sudo` 运行 |
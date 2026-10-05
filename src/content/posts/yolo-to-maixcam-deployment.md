---
title: '如何将本地训练的YOLO模型部署到MaixCAM上'
published: 2026-08-07
updated: 2026-08-07
description: '手把手教你将本地训练的YOLOv8模型导出、裁剪并通过算能TPU‑MLIR转换为MaixCAM可运行的cvimodel文件，全程在Docker容器内操作，包含脚本详解与排错指导。'
image: 'https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74b7166b0e4.png'
tags: ['YOLOv8', 'MaixCAM', '模型部署', 'TPU-MLIR', 'Docker', '边缘计算', 'ONNX']
category: 'General'
draft: false
---

# 如何将本地训练的YOLO模型部署到MaixCAM上

将训练好的 YOLOv8 检测模型部署到 MaixCAM 这样的边缘设备上，最关键的环节就是把 PyTorch 权重转换为设备计算芯片支持的格式。MaixCAM 采用算能（Sophgo）的 CV181x 系列处理器，模型转换使用 **TPU‑MLIR** 工具链。整个过程涉及模型导出、裁剪、量化、编译等多个步骤，而且对依赖环境极其敏感。因此，官方强烈建议在 **Docker 容器** 中完成转换，以避免 Python 版本与系统库不兼容导致的诡异错误。

本教程以 YOLOv8 基础检测模型为例，带你一步步走通从本地权重到 MaixCAM 可部署文件的完整流程。如果你的模型是其他架构（如 YOLOv5 或自定义检测头），文中也会说明如何对应修改参数。请确保已经参照 [MaixPy 官方文档 —— AI 模型转换（MaixCAM）](https://wiki.sipeed.com/maixpy/doc/zh/ai_model_converter/maixcam.html) 搭建好基础环境。

## 前置准备：Docker 环境

因为转换工具 `tpu‑mlir` 需要特定版本的 Python 和系统库，推荐直接使用算能官方提供的 Docker 镜像。如果电脑上还没有 Docker，请先按 [Docker 官方文档](https://docs.docker.com/get-docker/) 安装。安装完成后，在终端执行：

```bash
docker --version
```

看到版本号就说明 Docker 可用。

接着拉取转换环境镜像：

```bash
docker pull sophgo/tpuc_dev:latest
```

如果因网络问题拉取失败，可以到 [tpu‑mlir 官方说明](https://github.com/sophgo/tpu-mlir) 里找到镜像压缩包直接下载加载：

```bash
wget https://sophon-file.sophon.cn/sophon-prod-s3/drive/24/06/14/12/sophgo-tpuc_dev-v3.2_191a433358ad.tar.gz
docker load -i sophgo-tpuc_dev-v3.2_191a433358ad.tar.gz
```

加载成功后用 `docker images | grep tpuc` 确认镜像名（通常是 `sophgo/tpuc_dev:latest`）。

![Docker Desktop 中已拉取的 tpuc_dev 镜像](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74b9a021c90.png)

> [!TIP]
> Docker 的核心概念要点：**镜像（Image）** 是静态的环境模板，**容器（Container）** 是镜像的运行实例，**卷（Volume）** 或绑定挂载（bind mount）用于容器和宿主机之间的文件共享。下文我们用 `-v` 参数将宿主机当前目录映射进容器，这样容器内生成的文件会直接出现在本地文件夹中。

## 第一步：将训练好的 `.pt` 模型导出为 ONNX

进入你的训练文件夹，一般情况下权重文件会保存在类似 `runs/train/exp/weights/best.pt` 的路径下。比如我这里使用的是 `Steel_ball/runs/yolov8_steel_ball/weights/best.pt`。

![训练权重文件夹](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74ba9a85c9e.png)

激活安装了 PyTorch 和 Ultralytics YOLO 的 Python 环境，然后运行导出命令：

```bash
yolo export model=best.pt format=onnx imgsz=224,320 simplify=True
```

**参数解释：**

- `model=best.pt`：待转换的权重文件路径。
- `format=onnx`：导出为 ONNX 格式。
- `imgsz=224,320`：固定输入尺寸，这里高度 224、宽度 320。MaixCAM 的屏幕接近 320×240，推荐使用 `320×224` 的横屏分辨率，能充分利用显示区域。如果你的应用场景是竖屏，可以互换长宽。
- `simplify=True`：简化 ONNX 计算图，移除冗余算子，降低后续转换出错概率。

执行成功后，当前目录会多出 `best.onnx` 文件。

![生成的 best.onnx 文件](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74bb790ece6.png)

## 第二步：模型裁剪 —— 仅保留推理必需部分

为什么还要裁剪？标准 ONNX 往往包含训练时的辅助节点，而 MaixCAM 只关心模型输入（images）和最终的检测输出。通过裁剪可以去掉无关图结构，减少转换出错的可能。详细原理可参阅 [官方 ONNX 导出说明](https://wiki.sipeed.com/maixpy/doc/zh/ai_model_converter/onnx_export.html)。

对于 **标准 YOLOv8 检测模型**，输出节点一般是固定的。使用以下命令提取关键部分：

```bash
python -c "import onnx,sys; onnx.utils.extract_model(sys.argv[1], sys.argv[2], [s.strip() for s in sys.argv[3].split(',')], [s.strip() for s in sys.argv[4].split(',')])" best.onnx export.onnx "images" "/model.22/dfl/conv/Conv_output_0,/model.22/Sigmoid_output_0"
```

这条命令看起来很长，拆解开就清楚了：

- 输入参数：依次接收脚本命令行参数，`sys.argv[1]` 是原始 ONNX 路径，`sys.argv[2]` 是裁剪后保存的文件名，`sys.argv[3]` 是用逗号分隔的输入节点名列表，`sys.argv[4]` 是输出节点名列表。
- 实际调用：`onnx.utils.extract_model('best.onnx', 'export.onnx', ['images'], ['/model.22/dfl/conv/Conv_output_0', '/model.22/Sigmoid_output_0'])`。
- 如何修改：如果你的模型不是标准 YOLOv8（比如是 YOLOv5，或者修改过检测头的 YOLOv8），请参考官方文档找到正确的输入/输出节点名。常用工具如 Netron 可以可视化 ONNX，方便查看节点名称。

运行成功后，文件夹中会多出 `export.onnx` 文件，这就是我们进入容器进行转换的起点。

![裁剪后的 export.onnx](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74bbfc2f1e8.png)

## 第三步：准备容器工作目录

在宿主机上找个合适的位置新建一个文件夹（建议全英文路径），例如 `maxicam_model_convert`。打开它，做三件事：

1. 把上一步生成的 `export.onnx` 复制进来。
2. 新建 `images` 文件夹，里面放 **20～100 张真实场景的图片**（推荐 50～100 张），用于量化校准。图片数量会影响量化精度，太少会损失准确率。
3. 从 `images` 中挑一张复制到 `maxicam_model_convert` 根目录下，重命名为 `test.jpg`，用作转换后的推理测试。

最终目录结构如下：

![准备就绪的工作目录](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74c168604a9.png)

## 第四步：启动容器并进入

在 `maxicam_model_convert` 文件夹内右键打开终端（Windows 推荐使用 Git Bash 或 PowerShell，Linux/macOS 直接用系统终端）。

![右键打开终端](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74bca6285ff.png)

运行以下命令交互式启动容器：

```bash
docker run --privileged -it -v "$($pwd.Path):/workspace" -w /workspace sophgo/tpuc_dev:latest
```

Linux / macOS 用户将 `$($pwd.Path)` 替换为 `$PWD` 即可：

```bash
docker run --privileged -it -v "$PWD:/workspace" -w /workspace sophgo/tpuc_dev:latest
```

**参数说明：**

- `--privileged`：赋予容器特权，某些系统调用需要（量化过程可能用到）。
- `-it`：交互式终端，方便后续手动执行脚本。
- `-v "$PWD:/workspace"`：将宿主机当前目录挂载到容器内的 `/workspace`，实现文件共享。
- `-w /workspace`：设置容器工作目录为 `/workspace`。
- 最后是镜像名 `sophgo/tpuc_dev:latest`。

如果你希望退出容器后自动删除容器，可以加一个 `--rm` 参数：

```bash
docker run --privileged --rm -it -v "$PWD:/workspace" -w /workspace sophgo/tpuc_dev:latest
```

执行后，终端就进入了容器内部的 Linux 环境。此时可以在 Docker Desktop 中看到运行中的容器实例：

![Docker Desktop 中的容器列表](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74bd245bdf5.png)

建议复制容器 ID（长串哈希值），下次可以直接通过 `docker start` 和 `docker exec` 重新进入同一个容器，避免每次 `docker run` 创建新容器（但用完记得删除）。例如：

```bash
docker start ba7da24badf8...
docker exec -it ba7da24badf8... bash
```

![复制容器 ID](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74bdd82c4e5.png)

此时你已经身处一个 Ubuntu 20.04 的编译环境，如下图：

![容器内终端](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74be3318477.png)

## 第五步：安装 TPU‑MLIR 并编写转换脚本

在容器终端中继续执行：

```bash
pip install tpu_mlir
```

安装完毕后运行 `model_transform.py --help`，如果看到帮助信息而不是报错，就表示一切就绪。

接下来我们需要依次编写三个 Shell 脚本。注意，这三个脚本中的变量名是相互对应的，随意更改可能导致找不到中间文件。

<!-- 用 vi 编辑，但也可以直接用 cat/echo 写入，这里保留原始操作 -->

### 5.1 convert.sh —— 模型转换

执行 `vi convert.sh`，按 `i` 进入编辑模式，粘贴以下内容（请根据你的实际模型名和路径修改）：

```bash
model_transform.py \
--model_name yolov8_steel_ball_v6 \
--model_def ./export.onnx \
--input_shapes [[1,3,224,320]] \
--mean "0,0,0" \
--scale "0.00392156862745098,0.00392156862745098,0.00392156862745098" \
--keep_aspect_ratio \
--pixel_format rgb \
--channel_format nchw \
--output_names "/model.22/dfl/conv/Conv_output_0,/model.22/Sigmoid_output_0" \
--test_input ./test.jpg \
--test_result yolov8_steel_ball_v6_top_outputs.npz \
--tolerance 0.99,0.99 \
--mlir yolov8_steel_ball_v6.mlir
```

![convert.sh 内容](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74bf19e3fd2.png)

**关键对应关系与修改指南：**

- `--model_name`：自定义模型名称，后续生成中间文件的前缀都和它一致（如 `yolov8_steel_ball_v6.mlir`，`yolov8_steel_ball_v6_top_outputs.npz` 等），请保持唯一且有意义。
- `--input_shapes`：必须与你导出 ONNX 时的 `imgsz` 一致，本例为 `[1,3,224,320]`（NCHW 格式）。
- `--output_names`：与裁剪时指定的输出节点完全一致。
- `--test_input`：指向根目录下的 `test.jpg`。
- `--test_result`：生成的参考输出文件，下一步量化时会用到，文件名前缀必须与 `--model_name` 一致。
- `scale` 值：`0.00392156862745098` 即 `1/255`，表示从 [0,255] 归一化到 [0,1]。如果你的模型在训练时使用了不同的归一化方式，请相应修改。

按 `Esc` 后输入 `:wq` 保存退出。

### 5.2 calibration.sh —— 量化校准表生成

同样 `vi calibration.sh`，写入：

```bash
run_calibration.py yolov8_steel_ball_v6.mlir \
--dataset ./images \
--input_num 200 \
-o yolov8_steel_ball_v6_table
```

![calibration.sh 内容](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74bf813fa72.png)

- 第一个参数 `yolov8_steel_ball_v6.mlir` 必须与 `convert.sh` 中 `--mlir` 输出的文件名相同。
- `--dataset ./images` 指向我们在第三步准备的图片文件夹。
- `--input_num 200` 表示最多使用 200 张图片做校准，如果文件夹内图片数不足 200 张则会全部使用（建议实际放 50~100 张即可）。
- `-o` 指定输出校准表名称，后续部署脚本会引用。

### 5.3 model_deploy.sh —— 编译成 cvimodel

`vi model_deploy.sh`，写入：

```bash
model_deploy.py \
--mlir yolov8_steel_ball_v6.mlir \
--quantize INT8 \
--quant_input \
--calibration_table yolov8_steel_ball_v6_table \
--processor cv181x \
--test_input yolov8_steel_ball_v6_in_f32.npz \
--test_reference yolov8_steel_ball_v6_top_outputs.npz \
--tolerance 0.9,0.6 \
--model yolov8_steel_ball_v6_int8.cvimodel
```

![model_deploy.sh 内容](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74bfdfcda75.png)

- `--mlir`、`--calibration_table`、`--test_input`、`--test_reference` 均需与前面的产出文件名匹配。
- `--processor cv181x` 指定目标芯片为 CV181x（MaixCAM 采用的系列）。
- `--tolerance 0.9,0.6`：精度容忍度，如果后续验证报错可以适当降低该阈值。
- 最终输出是 `yolov8_steel_ball_v6_int8.cvimodel`，这个就是可以直接拷贝到 MaixCAM 的模型文件。

**重要：三个脚本里的 `yolov8_steel_ball_v6` 贯穿始终，改任何一个地方都要同步修改其他所有相关位置。** 文件名、文件夹名、test.jpg 等也必须与脚本中指定的路径相符。

## 第六步：依次执行脚本

在容器终端内依次运行：

```bash
bash convert.sh          # ① 生成 MLIR 文件及参考输出
bash calibration.sh      # ② 生成量化校准表
bash model_deploy.sh     # ③ 编译出 cvimodel
```

每步成功后都会打印相关日志。几张成功截图供参考：

![convert.sh 成功](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74c239c9ba5.png)
![calibration.sh 成功](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74c2b7bcdce.png)

如果执行 `model_deploy.sh` 时出现如下错误：

```
RuntimeError: [!Error]: npz_tool.py compare ... --tolerance 0.9,0.6 --except - -vv
```

这表示定量比对时，INT8 模型与单精度参考输出的误差超出了 `0.9,0.6` 的设置。**原因**是量化过程带来的精度损失，个别通道的误差略大。解决方法是适当降低容忍度，比如将 `--tolerance 0.9,0.6` 改为 `--tolerance 0.6,0.4`。修改后重新运行 `bash model_deploy.sh` 即可。

![部署成功后的输出](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74c39cd8452.png)

## 第七步：编写 `.mud` 配置文件

`.mud` 是 MaixPy 使用的模型描述文件，用来告诉程序模型的属性。创建 `vi yolov8_steel_ball_v6.mud`，写入：

```ini
[basic]
type = cvimodel
model = yolov8_steel_ball_v6_int8.cvimodel

[extra]
model_type = yolov8
input_type = rgb
mean = 0, 0, 0
scale = 0.00392156862745098, 0.00392156862745098, 0.00392156862745098
labels = steel_ball
```

**字段说明及个性化修改：**

- `model`：填最终生成的 `.cvimodel` 文件名。
- `model_type`：模型架构，标准 YOLOv8 检测写 `yolov8`，如果你用的是 v5 或其他结构，请按实际填写（参考 MaixPy 支持的模型类型）。
- `input_type`：输入彩色空间，训练用 RGB 则写 `rgb`。
- `mean` / `scale`：必须与 `convert.sh` 中的设置相同。
- `labels`：你的检测类别名称列表，多个类别用逗号分隔，例如 `steel_ball,bolt`。

保存后，你的文件夹里应包含 `.mud` 和 `.cvimodel` 两个关键文件。

![最终输出的 mud 和 cvimodel 文件](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/08/07/6a74c471911b8.png)

## 第八步：部署到 MaixCAM

将 `yolov8_steel_ball_v6_int8.cvimodel` 和 `yolov8_steel_ball_v6.mud` 两个文件，通过串口、U 盘或 FTP 等方式复制到 MaixCAM 的存储中。然后在 MaixPy 代码里按照官方示例加载模型即可运行推理。

---

至此，你本地训练的 YOLO 模型已经成功转换为 MaixCAM 能直接运行的格式。整个流程的关键在于：**ONNX 输入尺寸与后续转换尺寸一致、输出节点正确、量化图片足够真实、各脚本文件名环环相扣**。熟记这些对应关系，后续更换模型或调整输入大小时就能游刃有余。
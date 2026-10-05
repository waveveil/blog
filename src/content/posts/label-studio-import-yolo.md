---
title: 使用Label Studio 导入并查看已有标注数据集
published: 2026-05-16
updated: 2026-05-16
description: '学习如何将已有标注的数据集（如YOLO格式）导入Label Studio，并通过Python脚本转换标签格式，实现可视化查看标注框。'
image: ''
tags: [Label Studio, 数据标注, YOLO, 数据集导入, Python, 计算机视觉]
category: 'General'
draft: false
---

# Label Studio 导入已有标注数据集

在计算机视觉项目中，我们经常需要复用公开数据集或他人分享的标注数据。这些数据集通常以特定格式存储标签，例如 YOLO 格式的 `.txt` 文件。然而，Label Studio 作为一款强大的开源标注工具，默认不支持直接导入单个标签文件，它需要特定的 JSON 结构来识别标注信息。

本文将手把手教你如何将 YOLO 格式的标注数据转换为 Label Studio 可识别的 JSON 文件，并成功导入可视化查看每一个标注框的位置。

## 问题分析

Label Studio 导入标注数据时，期望接收一个 JSON 数组，每个元素包含数据路径和对应的预测或标注结果。结构大致如下：

```json
[
  {
    "data": {
      "image": "/data/local-files/?d=./images/sample.jpg"
    },
    "predictions": [
      {
        "result": [
          {
            "id": "box1",
            "type": "rectanglelabels",
            "from_name": "label",
            "to_name": "image",
            "value": {
              "x": 10.0,
              "y": 20.0,
              "width": 30.0,
              "height": 40.0,
              "rectanglelabels": ["cat"]
            }
          }
        ]
      }
    ]
  }
]
```

而我们手头的数据往往是 YOLO 格式的 `.txt` 文件，每一行代表一个标注框，格式为：

```
class_id x_center y_center width height
```

所有坐标值均已归一化到 [0, 1] 之间。

因此，我们需要一个转换脚本，将 YOLO 标签转换为 Label Studio 所需的 JSON 结构。

## 准备工作

在开始之前，请确保你的环境中已安装：

- Python 3.6+
- Label Studio（可通过 `pip install label-studio` 安装）
- 一个包含图片和 YOLO 标签文件夹的数据集

## Python 转换脚本

下面这个脚本可以将 YOLO 格式的标签批量转换为 Label Studio 可导入的 JSON 文件。请根据你的数据集修改路径和类别列表。

```python
import os
import json

# ====== 配置区 ======
IMAGE_DIR = './images'          # 图片文件夹路径
LABEL_DIR = './labels'          # 标签文件夹路径
OUTPUT_JSON = './labelstudio.json'  # 输出文件路径
CLASSES = ['fire', 'smoke']     # 你的类别列表（顺序需与 YOLO 类别索引一致）
# ===================

tasks = []

for img_name in os.listdir(IMAGE_DIR):
    if not img_name.lower().endswith(('.jpg', '.jpeg', '.png')):
        continue

    base_name = os.path.splitext(img_name)[0]
    label_path = os.path.join(LABEL_DIR, base_name + '.txt')

    # 构建基础 task 结构
    task = {
        "data": {
            "image": f"/data/local-files/?d={IMAGE_DIR}/{img_name}"
        },
        "predictions": []
    }

    if os.path.exists(label_path):
        with open(label_path, "r") as f:
            lines = f.readlines()

        annotations = []
        for idx, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            parts = line.split()
            class_idx = int(parts[0])
            x_center = float(parts[1])
            y_center = float(parts[2])
            width = float(parts[3])
            height = float(parts[4])

            # Label Studio 使用百分比坐标（0-100），需将归一化坐标转换
            annotation = {
                "result": [
                    {
                        "id": f"{base_name}_{idx}",
                        "type": "rectanglelabels",
                        "from_name": "label",
                        "to_name": "image",
                        "value": {
                            "x": (x_center - width / 2) * 100,
                            "y": (y_center - height / 2) * 100,
                            "width": width * 100,
                            "height": height * 100,
                            "rectanglelabels": [CLASSES[class_idx]]
                        }
                    }
                ]
            }
            annotations.append(annotation)

        task["predictions"] = annotations

    tasks.append(task)

# 写入 JSON 文件
with open(OUTPUT_JSON, "w") as f:
    json.dump(tasks, f, indent=2)

print(f"转换完成！共处理 {len(tasks)} 张图片，输出文件：{OUTPUT_JSON}")
```

> **重要说明**：脚本中的图片路径使用 `/data/local-files/?d=...` 格式，这是 Label Studio 本地文件存储的约定路径。如果你的图片放在其他位置，请相应调整。

## 运行脚本

如果你是第一次接触命令行，别担心，按照以下步骤操作：

1. **创建 Python 文件**  
   在你的数据集文件夹内新建一个文本文件（例如 `convert.txt`），将上面的 Python 代码完整复制进去。
![1778942145802.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a0880c31d195.png)
![1778942235544.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a08811c8e60d.png)
2. **保存并重命名**  
   - 按 `Ctrl+S` 保存文件（**这一步非常重要**，否则修改不会生效）。  
   - 将文件名改为 `convert.py`（注意扩展名是 `.py`，不是 `.txt`）。
![1778942270662.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a08813ecbabb.png)
3. **打开终端**  
   - 在文件夹空白处按住 `Shift` 键并右键点击，选择“在此处打开 PowerShell 窗口”或“在终端中打开”。  
   - 或者直接打开命令行，使用 `cd` 命令切换到该文件夹。

4. **运行脚本**  
   输入以下命令并回车：
   ```bash
   python convert.py
   ```
   如果你的系统安装了 Python 3 且默认命令是 `python3`，请使用：
   ```bash
   python3 convert.py
   ```

5. **检查输出**  
   运行成功后，你会在文件夹内看到一个 `labelstudio.json` 文件。打开它，内容应该类似于：

   ```json
   [
     {
       "data": {
         "image": "/data/local-files/?d=./images/bothFireAndSmoke_UAV000004.jpg"
       },
       "predictions": [
         {
           "result": [
             {
               "id": "bothFireAndSmoke_UAV000004_0",
               "type": "rectanglelabels",
               "from_name": "label",
               "to_name": "image",
               "value": {
                 "x": 81.90,
                 "y": 57.32,
                 "width": 4.82,
                 "height": 2.15,
                 "rectanglelabels": ["smoke"]
               }
             }
           ]
         }
       ]
     }
   ]
   ```

   这说明转换成功，标注数据已准备就绪。

## 导入 Label Studio

### 1. 准备数据源

Label Studio 默认关闭本地文件存储功能。要启用它，你需要在项目根目录下创建一个名为 `mydata` 的文件夹（注意名称固定）。

- 在 Label Studio 的启动目录下新建 `mydata` 文件夹。  
- 将你的图片文件夹（例如 `images`）**复制**或**移动**到 `mydata` 内。最终结构应为：
  ```
  mydata/
  └── images/
      ├── img001.jpg
      ├── img002.jpg
      └── ...
  ```
![1778943483763.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a0885fc72827.png)
### 2. 启动 Label Studio

在终端中输入：
```bash
label-studio
```

启动后，Label Studio 会自动识别 `mydata` 文件夹并开启本地数据源功能。

### 3. 创建项目并导入 JSON

1. 打开浏览器访问 `http://localhost:8080`。  
2. 点击 **Create** 创建一个新项目，填写项目名称（例如 `YOLO 数据集预览`）。  
3. 在 **Labeling Setup** 中，选择 **Object Detection with Bounding Boxes** 模板，并添加你的类别（`fire`, `smoke`）。  
4. 点击 **Save** 进入项目页面。  
5. 在项目页面，点击右上角的 **Import** 按钮，选择你生成的 `labelstudio.json` 文件并上传。
![1778943197089.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a0884de7ae9d.png)
### 4. 配置数据源

上传完成后，你可能会看到图片无法显示，这是因为 Label Studio 还不知道去哪里找图片文件。我们需要手动配置数据源：

1. 点击右上角的 **Settings**（齿轮图标）。  
![1778943265078.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a08852216c27.png)
2. 在左侧菜单中，选择 **Cloud Storage**。  
3. 点击 **Add Source Storage**。  
![1778943310825.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a08854f0ca4e.png)
4. 在弹出的窗口中：
   - **Storage Type**：选择 **Local files**。  
![1778943525771.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a08862604d35.png)
   - **Absolute local path**：填写 `mydata` 文件夹的绝对路径（例如 `/home/user/mydata` 或 `C:\Users\YourName\mydata`）。
![1778943636923.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a08869532f6d.png)
   - **File Filter**：可以留空或填写 `.*\.(jpg|jpeg|png)`。  
   - **Treat every bucket object as a source file**：保持默认。  
![1778943699055.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a0886d3c44e5.png)
5. 点击 **Check Connection** 测试连接，成功后点击 **Add Storage**。
![1778943783173.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a088727ca37c.png)
![1778943825248.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a08875173639.png)
### 5. 同步数据

添加存储源后，回到项目页面，点击右上角的 **Sync** 按钮（同步图标）。Label Studio 会将 JSON 中引用的图片路径与 `mydata` 文件夹中的实际文件进行匹配。

同步完成后，点击任意一张图片，你应该就能看到 YOLO 标注框完美地显示在图片上了！
![1778944873500.png](https://photo-1328807417.cos.ap-guangzhou.myqcloud.com/2026/05/16/6a088b69d467d.png)
## 常见问题

### Q：导入后图片显示为空白？
A：最常见的原因是数据源配置不正确。请确保：
- `mydata` 文件夹存在于 Label Studio 启动目录下。
- 图片确实在 `mydata` 的子文件夹中。
- JSON 中的图片路径与实际存储路径一致。

### Q：标注框位置不对？
A：请检查 YOLO 坐标是否已正确转换为百分比坐标。脚本中已经做了转换：`(x_center - width/2) * 100`。如果仍然不对，可能是 YOLO 格式中的坐标顺序或归一化方式有差异。

### Q：类别名称显示为数字？
A：请确保在 Label Studio 的标注模板中定义的类别顺序与 Python 脚本中的 `CLASSES` 列表顺序完全一致。

## 总结

通过上述步骤，你可以轻松地将任何 YOLO 格式标注的数据集导入 Label Studio，并可视化查看所有标注框。这个技巧不仅适用于学习他人数据集的标注风格，也适合团队协作时统一标注格式。

如果你经常需要处理不同格式的标注数据，建议将转换脚本保存为通用工具，只需修改类别列表和路径即可快速复用。
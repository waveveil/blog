---
title: 深度学习实战：Kaggle房价预测全流程解析
published: 2026-03-18
updated: 2026-03-18
description: '从数据下载、预处理到模型训练与评估，手把手带你完成Kaggle房价预测竞赛项目，并深入解析关键概念与代码实现。'
image: ''
tags: [pytorch, kaggle, 机器学习, 数据处理]
category: '深度学习'
draft: false
---

在数据科学和机器学习的入门旅程中，Kaggle竞赛无疑是最好的实战沙场。其中，房价预测（House Prices: Advanced Regression Techniques）因其经典性和完备性，成为无数学习者的“第一战”。本文将带你完整走一遍这个项目的流程，从数据获取到最终提交，并深入探讨几个关键的数据处理与模型训练概念。  
:::note  
本文方法参考教材《动手学深度学习》。  
:::
## 项目概述与数据获取

我们的目标是利用房屋的各类特征（如面积、房龄、地段等）来预测其最终售价。这是一个经典的**回归问题**。首先，我们需要获取数据。

### 数据下载与解压工作流

一个健壮的数据获取流程至关重要。我们通常会编写一个通用的下载函数，处理网络请求、文件校验和本地缓存。

```python
import hashlib
import os
import tarfile
import zipfile
import requests

DATA_HUB = dict()
DATA_URL = 'http://d2l-data.s3-accelerate.amazonaws.com/'

def download(name, cache_dir=os.path.join('..', 'data')):
    """下载数据集并校验SHA-1哈希值，支持缓存以避免重复下载。"""
    assert name in DATA_HUB, f"{name}不在{DATA_HUB}中"
    url, sha1_hash = DATA_HUB[name]
    os.makedirs(cache_dir, exist_ok=True)
    fname = os.path.join(cache_dir, url.split('/')[-1])
    # 检查文件是否已存在且哈希值匹配
    if os.path.exists(fname):
        sha1 = hashlib.sha1()
        with open(fname, 'rb') as f:
            while True:
                data = f.read(1048576) # 读取1MB数据块
                if not data:
                    break
                sha1.update(data)
        if sha1.hexdigest() == sha1_hash:
            return fname # 缓存有效，直接返回路径
    # 下载文件
    print(f"正在从{url}下载{fname}")
    r = requests.get(url, stream=True, verify=True)
    with open(fname, 'wb') as f:
        f.write(r.content)
    return fname
```

**代码解析**:
*   `cache_dir=os.path.join('..', 'data')`: 设置默认缓存目录为上级目录的`data`文件夹。`os.path.join`能智能处理不同操作系统的路径分隔符。
*   `url.split('/')[-1]`: 从URL中提取文件名。`split('/')`将URL按`/`分割成列表，`[-1]`取列表最后一个元素。
*   `os.makedirs(cache_dir, exist_ok=True)`: 创建目录，`exist_ok=True`参数确保目录已存在时不会报错。
*   `stream=True`: 使用流式下载，对于大文件可以边下边存，避免内存占用过高。
*   `verify=True`: 启用SSL证书验证，保证下载安全。

下载完成后，我们还需要解压文件：

```python
def download_extract(name, folder=None):
    """下载并解压文件。"""
    fname = download(name)
    base_dir = os.path.dirname(fname)
    data_dir, ext = os.path.splitext(fname)
    if ext == '.zip':
        fp = zipfile.ZipFile(fname, 'r')
    elif ext in ('.tar', '.gz'):
        fp = tarfile.open(fname, 'r')
    else:
        assert False, '文件类型不受支持'
    fp.extractall(base_dir)
    return os.path.join(base_dir, folder) if folder else data_dir
```

定义了数据获取工具后，我们注册并下载本次竞赛所需的数据：

```python
# 注册数据集URL和哈希值
DATA_HUB['kaggle_house_train'] = (
    DATA_URL + 'kaggle_house_pred_train.csv',
    '585e9cc93e70b39160e7921475f9bcd7d31219ce')
DATA_HUB['kaggle_house_test'] = (
    DATA_URL + 'kaggle_house_pred_test.csv',
    'fa19780a7b011d9b009e8bff8e99922a8ee2eb90')

# 使用pandas读取CSV数据
import pandas as pd
train_data = pd.read_csv(download('kaggle_house_train'))
test_data = pd.read_csv(download('kaggle_house_test'))

print(f'训练集形状: {train_data.shape}') # 输出: (1460, 81)
print(f'测试集形状: {test_data.shape}')   # 输出: (1459, 80)
```

至此，数据已成功加载到内存中，成为我们可以操作的`DataFrame`对象。

## 数据预处理：为模型训练做准备

原始数据往往不能直接喂给模型。预处理的目标是**将数据转化为模型易于学习的形式**。这一步通常决定了模型性能的上限。

### 1. 合并训练集与测试集

这是预处理中非常关键且容易被忽视的一步。**我们先将训练集和测试集的特征部分合并，再进行统一的预处理操作。**

```python
# 移除训练集中的‘Id’列和‘SalePrice’标签列，移除测试集中的‘Id’列
all_features = pd.concat((train_data.iloc[:, 1:-1], test_data.iloc[:, 1:]))
```

> **Q1: 为什么要合并训练集和测试集？**
> 这是为了保证预处理变换（如标准化、缺失值填充、编码）在训练集和测试集上**保持一致**。例如，标准化时计算均值和标准差。如果分开处理，训练集用自己`面积`的均值（比如50）标准化，测试集用自己`面积`的均值（比如100）标准化，那么模型在训练时学到的“尺度”就完全乱套了，在测试集上的表现会非常差。合并处理确保了“规则”的唯一性。

### 2. 处理数值特征：标准化与缺失值填充

首先，我们区分出数值型特征。

```python
numeric_features = all_features.dtypes[all_features.dtypes != 'object'].index
```

然后进行**标准化**（Standardization）。

```python
all_features[numeric_features] = all_features[numeric_features].apply(
    lambda x: (x - x.mean()) / (x.std()))
```

> **Q2: 为什么要进行标准化？**
> 主要有两个原因：
> 1.  **优化便利性**：许多优化算法（如梯度下降）在特征尺度相近时收敛更快、更稳定。如果特征A的范围是[0, 1]，而特征B的范围是[0, 100000]，那么损失函数的“地形”会非常陡峭蜿蜒，难以高效找到最低点。
> 2.  **公平对待特征**：在正则化（如L2正则）模型中，惩罚项会施加在所有系数上。如果一个特征的数值范围很大，其系数自然会被“挤压”得很小，这并非因为该特征不重要，而是尺度造成的假象。标准化后，所有特征被置于同一尺度下，模型能更公平地评估每个特征的重要性。

标准化后，每个数值特征的均值变为0。此时，我们可以很自然地将缺失值（NaN）填充为0。

```python
all_features[numeric_features] = all_features[numeric_features].fillna(0)
```

### 3. 处理类别特征：独热编码（One-Hot Encoding）

对于非数值的类别特征（如房屋类型`HouseStyle`，街区`Neighborhood`），我们需要将其转换为数值形式。最常用的方法是**独热编码**。

```python
all_features = pd.get_dummies(all_features, dummy_na=True)
print(f'编码后特征维度: {all_features.shape}')
```

> **Q3: One-Hot 编码（独热编码）是干什么的？**
> 独热编码将具有`K`个类别的特征转换为`K`个二进制特征（列）。对于每个样本，只有对应其类别的那个二进制特征为1，其余均为0。
> *   **例如**：特征“颜色”有{红，绿，蓝}三个类别。
>     *   红色样本编码为：[1, 0, 0]
>     *   绿色样本编码为：[0, 1, 0]
>     *   蓝色样本编码为：[0, 0, 1]
> 这样做的好处是避免了给类别赋予任意大小关系（比如认为“蓝”>“绿”>“红”），让模型能够平等地看待每个类别。`dummy_na=True`参数会为缺失值（NaN）也单独创建一个二进制列。

Pandas的`get_dummies`默认生成布尔类型。为了后续转换为NumPy数组和张量，我们需要将其转换为整数。

```python
all_features = all_features.replace({True: 1, False: 0})
```

### 4. 转换为模型输入：从DataFrame到PyTorch Tensor

预处理完成后，我们需要将数据从Pandas的DataFrame格式，转换为PyTorch模型能够处理的Tensor格式。

```python
import torch

n_train = train_data.shape[0]
# 分割回训练集和测试集
train_features = torch.tensor(all_features[:n_train].values, dtype=torch.float32)
test_features = torch.tensor(all_features[n_train:].values, dtype=torch.float32)
# 提取训练标签（房价）
train_labels = torch.tensor(
    train_data.SalePrice.values.reshape(-1, 1), dtype=torch.float32)
```

> **Q4: 数据是怎么一步步通过下载，解压，再到pandas读取，再到最后转成训练所需的tensor格式的？**
> 这就是一个典型的**机器学习数据流水线**：
> 1.  **获取与存储**：`download()`函数从网络获取原始数据文件，并保存到本地缓存。
> 2.  **加载与初探**：`pd.read_csv()`将本地CSV文件读入内存，转换为结构化的`DataFrame`，便于查看和操作。
> 3.  **清洗与转换**：在`DataFrame`上进行合并、标准化、编码、缺失值处理等操作。这是核心的数据工程环节。
> 4.  **格式转换**：通过`.values`将`DataFrame`转换为NumPy `ndarray`，再使用`torch.tensor()`将其转换为PyTorch `Tensor`。`Tensor`可以直接在GPU上运行，并支持自动微分。
> 5.  **喂入模型**：最终的`train_features`和`train_labels`被分批（`DataLoader`）送入神经网络进行训练。

## 模型训练与评估

我们从一个简单的线性模型开始。

### 定义模型与损失函数

```python
from torch import nn

in_features = train_features.shape[1]
loss = nn.MSELoss() # 均方误差损失，适用于回归问题

def get_net():
    """定义一个简单的单层线性回归网络。"""
    net = nn.Sequential(nn.Linear(in_features, 1))
    return net
```

由于房价是正数，且我们关心相对误差，定义一个对数均方根误差（Log RMSE）作为评估指标更为合适。

```python
def log_rmse(net, features, labels):
    clipped_preds = torch.clamp(net(features), 1, float('inf'))
    rmse = torch.sqrt(loss(torch.log(clipped_preds), torch.log(labels)))
    return rmse.item()
```

### 训练循环

```python
def train(net, train_features, train_labels, test_features, test_labels,
          num_epochs, learning_rate, weight_decay, batch_size):
    train_ls, test_ls = [], []
    # 使用d2l库中的工具函数创建数据迭代器
    train_iter = d2l.load_array((train_features, train_labels), batch_size)
    optimizer = torch.optim.Adam(net.parameters(),
                                 lr=learning_rate,
                                 weight_decay=weight_decay)
    for epoch in range(num_epochs):
        for X, y in train_iter:
            optimizer.zero_grad()
            l = loss(net(X), y)
            l.backward()
            optimizer.step()
        train_ls.append(log_rmse(net, train_features, train_labels))
        if test_labels is not None:
            test_ls.append(log_rmse(net, test_features, test_labels))
    return train_ls, test_ls
```

### K折交叉验证：在有限数据上稳健调参

当数据量不大时，直接分割出的验证集可能代表性不足。**K折交叉验证**是解决这一问题的利器。

:::tip[K折交叉验证原理]
将训练数据均匀分成K份（“折”）。依次将其中1份作为验证集，其余K-1份作为训练集，进行K次独立的训练和验证。最终模型的性能取这K次验证结果的平均值。这种方法充分利用了有限的数据，评估结果更加稳健。
:::

```python
def get_k_fold_data(k, i, X, y):
    """获取第i折交叉验证所需的数据。"""
    assert k > 1
    fold_size = X.shape[0] // k
    X_train, y_train = None, None
    for j in range(k):
        idx = slice(j * fold_size, (j + 1) * fold_size)
        X_part, y_part = X[idx, :], y[idx]
        if j == i: # 第i份作为验证集
            X_valid, y_valid = X_part, y_part
        elif X_train is None:
            X_train, y_train = X_part, y_part
        else:
            X_train = torch.cat([X_train, X_part], 0)
            y_train = torch.cat([y_train, y_part], 0)
    return X_train, y_train, X_valid, y_valid

def k_fold(k, X_train, y_train, num_epochs, lr, weight_decay, batch_size):
    """执行K折交叉验证，返回平均训练和验证误差。"""
    train_l_sum, valid_l_sum = 0, 0
    for i in range(k):
        data = get_k_fold_data(k, i, X_train, y_train)
        net = get_net()
        train_ls, valid_ls = train(net, *data, num_epochs, lr,
                                   weight_decay, batch_size)
        train_l_sum += train_ls[-1]
        valid_l_sum += valid_ls[-1]
        print(f'折{i + 1}，训练log rmse: {float(train_ls[-1]):f}, '
              f'验证log rmse: {float(valid_l[-1]):f}')
    return train_l_sum / k, valid_l_sum / k
```

现在，我们可以用交叉验证来评估我们的模型和超参数设置。

```python
k, num_epochs, lr, weight_decay, batch_size = 5, 100, 5, 0, 64
train_l, valid_l = k_fold(k, train_features, train_labels, num_epochs, lr,
                          weight_decay, batch_size)
print(f'{k}-折验证: 平均训练log rmse: {float(train_l):f}, '
      f'平均验证log rmse: {float(valid_l):f}')
```

> **为什么要用K折交叉验证来评估超参数？**
> 超参数（如学习率`lr`、权重衰减`weight_decay`）不是模型从数据中学到的，而是需要我们手动设定的。如果我们用全部数据训练一次就选定超参数，很容易因为数据偶然的划分方式而导致选择不佳（过拟合验证集）。K折交叉验证通过多次不同的数据划分，给出了一个更可靠的平均性能估计，帮助我们选出泛化能力更强的超参数组合。

## 最终训练与提交

通过K折交叉验证，我们对模型性能有了信心。现在，使用**全部训练数据**和选定的超参数，重新训练最终模型，并在测试集上进行预测。

```python
def train_and_pred(train_features, test_features, train_labels, test_data,
                   num_epochs, lr, weight_decay, batch_size):
    net = get_net()
    train_ls, _ = train(net, train_features, train_labels, None, None,
                        num_epochs, lr, weight_decay, batch_size)
    print(f'最终训练log rmse：{float(train_ls[-1]):f}')
    # 在测试集上进行预测
    preds = net(test_features).detach().numpy()
    # 格式化结果以提交Kaggle
    test_data['SalePrice'] = pd.Series(preds.reshape(1, -1)[0])
    submission = pd.concat([test_data['Id'], test_data['SalePrice']], axis=1)
    submission.to_csv('submission.csv', index=False)

# 使用全部训练数据训练最终模型
train_and_pred(train_features, test_features, train_labels, test_data,
               num_epochs, lr, weight_decay, batch_size)
```

运行上述代码后，会在当前目录生成一个`submission.csv`文件，将其上传至Kaggle，即可看到你的模型在排行榜上的得分。

## 总结与展望

通过这个项目，我们实践了一个完整的机器学习流水线。我们从一个简单的线性模型开始，但真正的挑战和乐趣在于数据预处理和模型评估。理解**为何要合并数据集、为何要标准化、独热编码的原理以及K折交叉验证的重要性**，远比调出一个复杂的网络结构更为基础且关键。

你可以在此基础上进行诸多改进：尝试更复杂的模型（如多层感知机MLP、梯度提升树XGBoost/LightGBM）、进行更精细的特征工程（如创建组合特征、处理偏态分布）、使用更高级的调参方法（如网格搜索、贝叶斯优化）等。Kaggle竞赛的讨论区和公开笔记本（Kernel）是学习这些进阶技巧的宝库。

希望这篇详细的解析能帮助你打下坚实的实战基础。机器学习之路，始于一行行代码，成于对每一个细节的深入思考。
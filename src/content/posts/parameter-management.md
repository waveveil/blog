---
title: 深度学习计算：参数管理
published: 2026-03-20
updated: 2026-03-20
description: '深入探讨PyTorch中神经网络参数的访问、初始化、绑定与复用等核心管理技巧，为高效模型训练与调试打下坚实基础。'
image: ''
tags: [pytorch, 深度学习, 神经网络, 参数管理]
category: '深度学习'
draft: false
---

在深度学习的旅程中，当我们精心设计了网络架构并设定了合适的学习率、批次大小等超参数后，真正的挑战才刚刚开始：**如何找到使损失函数最小的那组参数值？** 这个优化过程是模型训练的核心。然而，在此之前，我们必须先学会与这些参数“打交道”——如何查看它们、如何修改它们、如何将它们从一个模型迁移到另一个模型。这就是**参数管理**的艺术，也是本文将要探讨的主题。

## 一、 参数访问：认识你的模型“内脏”

在PyTorch中，一个神经网络（`nn.Module`）由层层堆叠的模块构成。每个模块，如线性层（`nn.Linear`），都包含其可训练的参数（权重 `weight` 和偏置 `bias`）。让我们从一个简单的网络开始，学习如何访问这些参数。

```python
import torch
from torch import nn

# 构建一个简单的序贯模型
net = nn.Sequential(nn.Linear(2, 3), nn.ReLU(), nn.Linear(3, 1))
X = torch.rand(size=(4, 2))
output = net(X)
print(output)
```

### 1.1 按索引访问层

我们可以像访问列表一样，通过索引来访问网络中的特定层。

```python
# net[0] 是第一层 (Linear(2,3))
# net[2] 是第三层 (Linear(3,1))
print(net[2])
```

### 1.2 获取状态字典：参数的“身份证”

`.state_dict()` 方法返回一个有序字典（`OrderedDict`），其中包含了该模块所有参数（`weight`, `bias`）的**张量值**。这是保存和加载模型参数的**标准方式**。

```python
# 查看第三层的参数状态字典
print(net[2].state_dict())
```
输出类似于：
```
OrderedDict([('weight', tensor([[ 0.1117, -0.0621, -0.0041]])),
             ('bias', tensor([0.5219]))])
```

:::tip
状态字典保存的是参数的**数据**（`tensor`），不包含计算图信息（如 `grad_fn`），因此非常适合用于模型持久化。
:::

### 1.3 访问参数对象：不仅仅是数据

在PyTorch中，参数是 `torch.nn.parameter.Parameter` 类的实例，它是 `Tensor` 的子类，并自动标记为需要梯度（`requires_grad=True`）。这意味着我们访问到的 `net[2].bias` 是一个包含数据和元信息的**对象**。

```python
print(type(net[2].bias))
# 输出: <class 'torch.nn.parameter.Parameter'>

print(net[2].bias)
# 输出: Parameter containing: tensor([0.5219], requires_grad=True)

# 访问参数底层的数据张量
print(net[2].bias.data)
# 输出: tensor([0.5219])

# 访问参数的梯度（在反向传播前为None）
print(net[2].weight.grad)
# 输出: None
```

### 1.4 一次性访问所有参数

对于复杂的模型，逐层访问非常繁琐。`named_parameters()` 方法是一个强大的工具，它返回一个迭代器，生成 `(name, parameter)` 对。

```python
# 访问第三层的所有参数及其名称
print([(name, param.shape) for name, param in net[2].named_parameters()])
# 输出: [('weight', torch.Size([1, 3])), ('bias', torch.Size([1]))]

# 访问整个网络的所有参数
print(*[(name, param.shape) for name, param in net.named_parameters()], sep='\n')
```
输出：
```
('0.weight', torch.Size([3, 2]))
('0.bias', torch.Size([3]))
('2.weight', torch.Size([1, 3]))
('2.bias', torch.Size([1]))
```
名称中的 `0.`、`2.` 对应了网络中的层索引，清晰地展示了参数的层级关系。

## 二、 复杂网络中的参数访问

当网络由嵌套的块（Block）构成时，访问特定参数需要沿着层级路径“深入”。

```python
def block1():
    return nn.Sequential(nn.Linear(4, 8), nn.ReLU(), nn.Linear(8, 4), nn.ReLU())

def block2():
    net = nn.Sequential()
    for i in range(4):
        net.add_module(f'block{i}', block1()) # 为每个子块命名
    return net

rgnet = nn.Sequential(block2(), nn.Linear(4, 1))
print(rgnet)
```
通过打印网络结构，我们可以看到清晰的层级：
```
Sequential(
  (0): Sequential(
    (block0): Sequential(...)
    (block1): Sequential(...)
    ...
  )
  (1): Linear(in_features=4, out_features=1, bias=True)
)
```
现在，要访问第一个大块（`rgnet[0]`）中第二个子块（`block1`）的第一个线性层（索引0）的偏置参数：

```python
# 访问路径: rgnet -> 第0层 -> 名为‘block1’的子模块 -> 第0层 -> bias参数 -> data
param_data = rgnet[0][1][0].bias.data
print(param_data)
```

## 三、 参数初始化：好的开始是成功的一半

默认情况下，PyTorch会根据层的类型使用特定的初始化策略（如 `nn.Linear` 使用 Kaiming 均匀初始化）。但在很多情况下，我们需要自定义初始化以满足特定需求。

### 3.1 使用内置初始化器

PyTorch在 `torch.nn.init` 模块中提供了丰富的初始化函数。我们可以通过 `apply()` 方法将初始化函数递归地应用到网络的每一个子模块上。

```python
def init_normal(m):
    """将线性层的权重初始化为正态分布，偏置初始化为0"""
    if type(m) == nn.Linear:
        nn.init.normal_(m.weight, mean=0, std=0.01)
        nn.init.zeros_(m.bias)

net.apply(init_normal)
print(net[0].weight.data[0], net[0].bias.data[0])
```

### 3.2 实现自定义初始化

假设我们需要一个特殊的初始化规则：权重以 1/4 概率取自 U(5,10)，以 1/2 概率为 0，以 1/4 概率取自 U(-10,-5)。我们可以这样实现：

```python
def my_init(m):
    if type(m) == nn.Linear:
        print(f‘Init {list(m.named_parameters())[0][0]}’)
        # 首先用均匀分布填充
        nn.init.uniform_(m.weight, -10, 10)
        # 然后，将绝对值小于5的权重置零
        # m.weight.data.abs() >= 5 产生一个布尔掩码
        # 与原始数据相乘，True保留原值，False变为0
        m.weight.data *= (m.weight.data.abs() >= 5)

net.apply(my_init)
print(net[0].weight.data[:2])
```

### 3.3 直接参数赋值

有时，我们可能需要直接修改参数的值。这可以通过访问参数的 `.data` 属性并赋值来实现。

```python
# 给第一层所有权重加1
net[0].weight.data[:] += 1
# 将第一层第一个神经元的第一个权重设为42
net[0].weight.data[0, 0] = 42
print(net[0].weight.data[0])
```

:::caution
直接修改 `.data` 会绕过自动微分系统，不会在计算图中留下记录。这在某些特定场景（如参数绑定、精细调优）下有用，但通常建议在初始化函数或优化器步骤中操作参数。
:::

## 四、 参数绑定：共享智慧的层

在某些架构中（如循环神经网络RNN、某些注意力机制），我们希望不同的层**共享同一组参数**。这可以减少模型参数量，并强制模型在不同位置学习相同的特征变换。

在PyTorch中实现参数绑定非常简单：只需将同一个模块实例分配给多个层即可。

```python
# 创建一个共享的线性层实例
shared = nn.Linear(8, 8)

# 在网络中多次使用这个实例
net = nn.Sequential(nn.Linear(2, 8),
                    nn.ReLU(),
                    shared,  # 第2层
                    nn.ReLU(),
                    shared,  # 第4层，与第2层共享参数
                    nn.ReLU(),
                    nn.Linear(8, 1))

output = net(X)
```
现在，`net[2]` 和 `net[4]` 是完全相同的对象。修改其中一个的参数，另一个会同步变化。

```python
# 验证它们是否是同一个对象（共享参数）
print(net[2].weight.data[0] == net[4].weight.data[0])
# 输出: tensor([True, True, ...])

# 修改net[2]的权重
net[2].weight.data[0, 0] = 100

# 检查net[4]的权重是否也变了
print(net[4].weight.data[0, 0])
# 输出: tensor(100.)
```

:::important
参数绑定是**引用绑定**。`net[2]` 和 `net[4]` 指向内存中同一个 `Parameter` 对象。这在构建具有参数共享特性的复杂模型时至关重要。
:::

## 五、 总结

通过本文，我们系统地学习了PyTorch中参数管理的核心操作：

1.  **访问**：使用索引、`.state_dict()` 和 `.named_parameters()` 探查模型内部。
2.  **初始化**：利用内置初始化器或自定义函数，通过 `.apply()` 为模型参数设定初始值。
3.  **赋值与绑定**：直接操作 `.data` 进行精细控制，并通过共享模块实例实现参数复用。

这些技能是模型调试、架构创新和迁移学习的基础。例如，在微调预训练模型时，我们常常会冻结一部分层的参数（通过设置 `param.requires_grad = False`），只训练另一部分。这本质上就是对特定参数的管理。
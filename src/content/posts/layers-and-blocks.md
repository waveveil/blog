---
title: 深度学习计算：层与块
published: 2026-03-19
updated: 2026-03-19
description: '深入探讨深度学习中的基本构建单元——块（Block），解析其设计思想、在PyTorch中的实现方式，以及如何通过组合块来构建复杂的神经网络模型。'
image: ''
tags: [pytorch, 深度学习, 神经网络]
category: '深度学习'
draft: false
---

在构建深度学习模型时，我们常常会听到“层”（Layer）和“块”（Block）这两个概念。初学者可能会感到困惑：它们之间有何区别与联系？为什么在层之上还需要抽象出“块”这个概念？本文将深入探讨“块”的设计哲学、实现机制及其在构建复杂模型中的强大作用。

## 从层到块：构建思维的进化

我们可以将神经网络的构建视为一个层层递进的过程：**神经网络 → 块 → 层**。

*   **层** 是最基础的运算单元，例如全连接层（`nn.Linear`）、卷积层（`nn.Conv2d`）或激活函数（`nn.ReLU`）。它接收输入张量，应用特定的参数化变换，并产生输出张量。
*   **块** 则是一个更高级的抽象。一个块可以：
    *   描述**单个层**。
    *   描述一个由**多个层组成的复合组件**（例如一个残差块 `ResidualBlock`）。
    *   描述**整个模型本身**。

它们都具备共同的核心特征：**有输入、有输出、可能有参数**。但“块”的魅力在于其**递归性**和**封装性**。想象一下，一个复杂的残差网络（ResNet）本身是一个大块，它由多个“阶段”（Stage）块组成，每个阶段块又由若干个基础的“残差”块堆叠而成。这种“套娃”式的设计，允许我们站在已有组件的肩膀上，快速搭建出功能强大、结构清晰的模型。

> 简单来说，**块就是一个具有“输入、处理、输出”能力的黑盒子**。最迷人的地方在于它的递归性——一个块可以由若干个层组成，甚至可以是一个具有复杂结构的网络本身。这让我们每一步都可以站在巨人的肩膀上。

![多个层被组合成块，形成更大的模型](https://zh.d2l.ai/_images/blocks.svg)
*示意图：多个基础层被组合成一个块，而块又可以作为组件去构建更大的模型。*

## 块的代码实现：PyTorch 中的 `nn.Module`

在 PyTorch 中，块的概念通过 `torch.nn.Module` 类来具体实现。任何自定义的神经网络组件，只要继承自 `nn.Module`，并实现其关键方法，就成为了一个“块”。

一个自定义块类通常必须包含：

1.  **`__init__` 函数**：用于定义网络的结构层次，初始化所需的层和参数。这里只是“声明”了网络的组件，并未构建实际的数据流。
2.  **`forward` 函数**：这是块的核心，定义了**前向传播**的逻辑。它接收输入 `X`，并指定数据如何经过在 `__init__` 中定义的组件，最终得到输出。
3.  **反向传播函数**：为了计算梯度，必须要有反向传播函数。幸运的是，在 PyTorch 中，**我们通常无需手动实现它**。框架的自动微分（Autograd）系统会根据 `forward` 函数执行过程中构建的动态计算图，自动推导并执行反向传播路径。

下面是一个最简单的多层感知机（MLP）块的实现示例：

```python
import torch
from torch import nn
from torch.nn import functional as F

class MLP(nn.Module):
    def __init__(self):
        # 调用父类 nn.Module 的初始化函数
        super().__init__()
        # 定义网络结构：一个隐藏层和一个输出层
        self.hidden = nn.Linear(20, 256)  # 隐藏层，20维输入，256维输出
        self.out = nn.Linear(256, 10)     # 输出层，256维输入，10维输出

    def forward(self, X):
        # 定义前向传播：X -> 隐藏层 -> ReLU激活 -> 输出层
        return self.out(F.relu(self.hidden(X)))
```

使用这个自定义块：

```python
X = torch.rand(2, 20)  # 生成一个2个样本、20个特征的随机输入
net = MLP()            # 实例化我们的MLP块
output = net(X)        # 前向传播计算
print(output.shape)    # 输出形状应为 torch.Size([2, 10])
```

:::tip[继承 `nn.Module` 的好处]
通过继承 `nn.Module`，我们的自定义块自动获得了许多强大功能：
*   **参数管理**：所有在 `__init__` 中定义为 `nn.Parameter` 或 `nn.Module` 的属性都会被自动注册和追踪。可以通过 `net.parameters()` 访问所有参数。
*   **设备移动**：使用 `net.to(‘cuda’)` 可以轻松将整个块及其所有参数移动到GPU。
*   **序列化**：可以使用 `torch.save(net.state_dict(), …)` 方便地保存和加载模型。
:::

## 经典块示例：顺序块 `nn.Sequential`

当我们只需要简单地将多个层按顺序堆叠时，手动编写 `__init__` 和 `forward` 会显得冗余。为此，PyTorch 提供了 `nn.Sequential`，它本身就是一个预定义好的“顺序块”。

```python
# 使用 nn.Sequential 构建与上面自定义 MLP 功能相同的网络
net = nn.Sequential(
    nn.Linear(20, 256),
    nn.ReLU(),
    nn.Linear(256, 10)
)
output = net(X) # 使用方式完全一致
```

`nn.Sequential` 的 `forward` 函数就是简单地将输入依次传递给其包含的每一个子模块（子层或子块）。它是构建线性结构网络的利器。

## 超越简单堆叠：在 `forward` 中实现复杂逻辑

`forward` 函数的本质是一个普通的 Python 函数。这意味着我们可以在其中执行**任意计算逻辑**，而不仅仅是层的顺序调用。这为模型设计提供了极大的灵活性。

考虑下面这个更复杂的例子：

```python
class FixedHiddenMLP(nn.Module):
    def __init__(self):
        super().__init__()
        # 定义一个固定的、不参与梯度更新的随机权重矩阵
        self.rand_weight = torch.rand((20, 20), requires_grad=False)
        # 定义一个可学习的线性层
        self.linear = nn.Linear(20, 20)

    def forward(self, X):
        X = self.linear(X)  # 第一次线性变换
        # 使用固定权重进行矩阵乘法，并加上偏置，然后通过ReLU
        X = F.relu(torch.mm(X, self.rand_weight) + 1)
        # 复用之前的线性层（共享参数）
        X = self.linear(X)
        # 引入控制流：如果X的绝对值总和大于1，则不断将其减半
        while X.abs().sum() > 1:
            X /= 2
        # 最终返回所有元素的和
        return X.sum()
```

在这个 `FixedHiddenMLP` 块的 `forward` 方法中，我们：
1.  进行了自定义的矩阵运算（`torch.mm`）。
2.  **复用了同一个 `self.linear` 层**，实现了参数共享。
3.  引入了 **Python 控制流（`while` 循环）**。这是 PyTorch 动态图的一大优势，静态图框架通常难以直接实现此类逻辑。

:::important[动态图的威力]
PyTorch 的**动态计算图**允许我们在 `forward` 函数中像编写普通 Python 程序一样编写网络逻辑，包括条件判断、循环、打印调试等。这使得研究和实现新颖的、结构动态的模型（如递归网络、注意力机制）变得非常直观。
:::

## 组合与嵌套：构建模型大厦

块的真正力量在于其可组合性。因为块本身也是 `nn.Module`，所以它可以作为另一个块的组成部分。

```python
class ComplexNet(nn.Module):
    def __init__(self):
        super().__init__()
        # 我们的网络包含多个子块
        self.feature_extractor = nn.Sequential(  # 一个顺序块作为特征提取器
            nn.Conv2d(3, 64, 3),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3),
            nn.ReLU(),
        )
        self.classifier = MLP()  # 使用之前定义的 MLP 块作为分类器
        self.attention = FixedHiddenMLP()  # 甚至可以使用那个复杂的块

    def forward(self, img, metadata):
        features = self.feature_extractor(img)
        # ... 可能在这里将 features 与 metadata 通过 self.attention 结合 ...
        final_output = self.classifier(features)
        return final_output
```

通过这种嵌套结构，我们可以像搭积木一样，用定义良好、功能明确的“块”来构建极其复杂而清晰的模型架构。这不仅提高了代码的**复用性**和**可读性**，也使得调试和维护大型项目变得更加容易。

## 总结

“块”是深度学习模型设计中承上启下的关键抽象。它封装了计算细节，提供了清晰的接口，并通过递归组合的能力，让我们能够管理日益复杂的模型结构。掌握如何设计和实现有效的块，是迈向高级深度学习实践的重要一步。

本文中涉及的所有代码示例，均已整理并发布在 GitHub 仓库中。你可以克隆仓库，运行代码，并在此基础上进行实验和探索。

::github{repo="Markfirst650/ai"}
---
title: pytorch训练模型的保存和加载方式
published: 2025-12-12
updated: 2025-12-12
description: "pytorch训练的模型如何保存和加载"
tags: [pytorch]
image: "1.webp"
category: "深度学习"
licenseName: "MIT"
author: "空柏"
draft: false
---

# 方法一
:::tip
保存模型结构以及权重参数  
:::
## 保存
```python
torch.save(net,'name.pth')#name和pth均可自定义  
```
## 加载
:::tip
加载时还是要带上模型的结构
:::
```python
#一个小陷阱，不带上原网络模型会报错
class Net (nn.Module):
    def __init__(self):
        super().__init__(
        self.f1 = nn.Linear(28 * 28,64)
        self.f2 = nn.Linear(64,64)
        self.f3 = nn.Linear(64,64)
        self.f4 = nn.Linear(64,10)

    def forward(self,x):
        x = relu(self.f1(x))
        x = relu(self.f2(x))
        x = relu(self.f3(x))
        x = log_softmax(self.f4(x), dim=1)
        return x
```
后再接
```python
net=torch.load('name.pth')
```
# 方法二
:::tip  
仅保存模型的权重参数（官方推荐）
:::
## 保存
```python
torch.save(net.state_dict(),'name.pth')#net为你的模型名
```
## 加载
```python
#同样需要先定义模型结构
class Net (nn.Module):
    def __init__(self):
        super().__init__(
        self.f1 = nn.Linear(28 * 28,64)
        self.f2 = nn.Linear(64,64)
        self.f3 = nn.Linear(64,64)
        self.f4 = nn.Linear(64,10)

    def forward(self,x):
        x = relu(self.f1(x))
        x = relu(self.f2(x))
        x = relu(self.f3(x))
        x = log_softmax(self.f4(x), dim=1)
        return x

net=Net()#实例化模型
net.load_state_dict(torch.load('name.pth'))
```
:::note  
根据保存方式，选择对应的加载方法  
:::





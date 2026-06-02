---
title: 使用多种机器学习算法分析csv数据
published: 2026-06-03
updated: 2026-06-03
description: '本文手把手教学了使用多种机器学习算法分析给定的csv数据，包括KMeans聚类，DBSACAN聚类，SVM支持向量机，XGBoost，LightGBM，CatBoost，MLP多层感知机，决策树规则提取'
image: ''
tags: [机器学习, pandas]
category: '机器学习'
draft: false
---
## 目录
1. [环境准备](#1-环境准备)
2. [数据加载与探索](#2-数据加载与探索)
3. [数据预处理](#3-数据预处理)
4. [特征选择](#4-特征选择)
5. [KMeans 聚类（无监督）](#5-kmeans-聚类)
6. [DBSCAN 聚类（无监督）](#6-dbscan-聚类)
7. [用聚类结果构建分类任务](#7-用聚类结果构建分类任务)
8. [SVM 支持向量机](#8-svm-支持向量机)
9. [XGBoost](#9-xgboost)
10. [LightGBM](#10-lightgbm)
11. [CatBoost](#11-catboost)
12. [深度学习（MLP 多层感知机）](#12-深度学习mlp-多层感知机)
13. [决策树规则提取（Entropy / Gini）](#13-决策树规则提取)
14. [模型对比总结](#14-模型对比总结)

---

## 1. 环境准备

### 需要安装的库

打开终端（Anaconda Prompt 或 VS Code 终端），逐条执行：

```bash
pip install pandas numpy matplotlib seaborn scikit-learn xgboost lightgbm catboost torch

# 如果上面的命令太慢，用清华镜像源：
pip install pandas numpy matplotlib seaborn scikit-learn xgboost lightgbm catboost torch -i https://pypi.tuna.tsinghua.edu.cn/simple
```

> **知识点：** 每个库的作用
> - `pandas`：处理表格数据（读CSV、筛选、统计）
> - `numpy`：数值计算
> - `matplotlib` + `seaborn`：画图
> - `scikit-learn`：机器学习算法（KMeans、DBSCAN、SVM、决策树、特征选择等）
> - `xgboost` / `lightgbm` / `catboost`：三大梯度提升树模型
> - `torch`：PyTorch 深度学习框架

### 导入所有需要的库

在 `.py` 文件或 Jupyter Notebook 最开头写上：

```python
# ========== 基础库 ==========
import pandas as pd               # pd 是约定的缩写，后面所有 pandas 操作用 pd.xxx
import numpy as np                # np 是约定的缩写
import matplotlib.pyplot as plt   # plt 是约定的缩写
import seaborn as sns             # 高级画图库
import warnings
warnings.filterwarnings('ignore') # 忽略警告信息，让输出更干净

# ========== 预处理 & 特征选择 ==========
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.feature_selection import SelectKBest, f_classif, mutual_info_classif
from sklearn.decomposition import PCA

# ========== 无监督学习 ==========
from sklearn.cluster import KMeans, DBSCAN

# ========== 监督学习 ==========
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier, export_text, plot_tree
from sklearn.ensemble import RandomForestClassifier

# ========== 模型评估 & 数据划分 ==========
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, silhouette_score,
                             davies_bouldin_score)

# ========== 三大 Boosting ==========
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier

# ========== 深度学习 ==========
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
```

---

## 2. 数据加载与探索

### 2.1 读取 CSV 文件

```python
# pd.read_csv() 是最常用的函数，把 CSV 变成 DataFrame（表格）
df = pd.read_csv('bcg_data.csv')

# 如果你的 CSV 和 Python 文件不在同一目录，写完整路径：
# df = pd.read_csv(r'D:\Users\Jay\Desktop\机器学习\期末\bcg_data.csv')
# 注意：路径前面的 r 表示"原始字符串"，避免 \ 被当成转义符
```

### 2.2 查看数据基本情况

```python
# 看前 5 行
df.head()
# df.head(10)  看前 10 行

# 看后 5 行
df.tail()

# 看数据形状：(行数, 列数)
df.shape
# 输出类似 (10890, 31)，表示 10890 行，31 列

# 看列名
df.columns.tolist()
# .tolist() 把列名转成列表，方便复制

# 看每列的数据类型
df.dtypes
# int64 是整数，float64 是小数（浮点数），object 是文本

# 看基本统计信息（均值、标准差、最小值、最大值等）
df.describe()
# 这个函数非常重要！可以快速发现异常值
```

### 2.3 检查缺失值

```python
# 每一列有多少缺失值
df.isnull().sum()
# isnull() 判断每个格子是否为空，sum() 把 True 的数量加起来

# 缺失值占总数的比例
df.isnull().sum() / len(df) * 100
# len(df) 是总行数，乘以 100 得到百分比
```

### 2.4 画图观察数据分布

```python
# 设置中文显示（Windows 用 SimHei，Mac 用 Arial Unicode MS）
plt.rcParams['font.sans-serif'] = ['SimHei']
plt.rcParams['axes.unicode_minus'] = False  # 解决负号显示问题

# 画所有列的分布直方图
df.hist(figsize=(20, 20), bins=50)
# figsize 是图片大小（英寸），bins 是柱子数量
plt.tight_layout()  # 自动调整子图间距
plt.show()

# 画相关系数热力图（看哪些特征彼此相关）
plt.figure(figsize=(20, 16))
# 只选数值列计算相关性
corr = df.corr()
sns.heatmap(corr, annot=False, cmap='coolwarm', center=0)
# annot=True 会在格子里写数字（列太多会很挤，所以这里用 False）
# cmap 是颜色主题，center=0 让 0 是白色
plt.title('特征相关系数热力图')
plt.show()
```

> **知识点：相关系数**
> - 取值范围 -1 到 1
> - 接近 1：正相关（A 增大 B 也增大）
> - 接近 -1：负相关（A 增大 B 减小）
> - 接近 0：没线性关系
> - 如果两个特征相关系数 > 0.95，说明它们几乎一样，可以删掉一个

---

## 3. 数据预处理

### 3.1 处理缺失值

```python
# 方法一：用该列的均值填充
df.fillna(df.mean(), inplace=True)
# fillna() 填充空值，df.mean() 计算每列的均值
# inplace=True 表示直接在原数据上修改，不需要重新赋值

# 方法二：用中位数填充（如果数据有极端值，中位数更好）
# df.fillna(df.median(), inplace=True)

# 方法三：直接删除有空值的行
# df.dropna(inplace=True)
```

### 3.2 处理无限值（inf）

```python
# 有些计算会产生无穷大，需要替换
df.replace([np.inf, -np.inf], np.nan, inplace=True)
# 先把 inf 变成 nan
df.fillna(df.mean(), inplace=True)
# 再用均值填充
```

### 3.3 标准化（非常重要！）

**为什么需要标准化？** 比如 `total_power` 值是几十亿，而 `crest_factor` 只有个位数。如果不标准化，数值大的特征会"压倒"数值小的特征，导致 KMeans、SVM、神经网络等算法失效。

```python
# StandardScaler：把每列变成 均值=0、标准差=1 的分布
scaler = StandardScaler()
# 先拟合（计算均值和标准差），再转换
df_scaled = scaler.fit_transform(df)
# fit_transform 返回的是 numpy 数组，不是 DataFrame

# 转回 DataFrame（方便后续操作）
df_scaled = pd.DataFrame(df_scaled, columns=df.columns)
# pd.DataFrame(数据, columns=列名) 把数组变成 DataFrame

# 查看标准化后的数据
df_scaled.describe()
# 现在每列的 mean 应该接近 0，std 接近 1
```

> **重要！** 标准化之后的 `df_scaled` 是我们后续所有分析的基础数据。原始数据 `df` 保留备用。

---

## 4. 特征选择

**为什么要做特征选择？** 31 个特征不是每个都有用。去掉无用特征可以让模型更快、更准、更好解释。

### 4.1 方法一：方差过滤（去掉变化太小的特征）

```python
from sklearn.feature_selection import VarianceThreshold

# 方差接近 0 的特征意味着这一列的值几乎不变，没有区分能力
selector = VarianceThreshold(threshold=0.01)
# threshold 是阈值，方差小于这个值的特征会被删除
selector.fit(df_scaled)

# 查看哪些特征被保留了
selected_features = df_scaled.columns[selector.get_support()].tolist()
print(f'保留的特征 ({len(selected_features)}/31):')
print(selected_features)

# 获取保留后的数据
df_filtered = pd.DataFrame(selector.transform(df_scaled),
                           columns=selected_features)
```

> **知识点：方差**
> - 方差衡量数据的"分散程度"
> - 如果一个特征 99% 的值都一样，它几乎没有信息量
> - 标准化后所有列方差都是 1，所以要在标准化前做这步。**但因为我们还没有标签，这里先演示方法，实际操作看 4.3。**

### 4.2 方法二：相关性过滤（去掉高度相关的特征）

```python
# 计算相关系数矩阵
corr_matrix = df_scaled.corr().abs()
# .abs() 取绝对值，因为我们只关心相关程度，不关心正负

# 找出相关系数 > 0.95 的特征对
high_corr_cols = []
# 只检查上三角矩阵（避免重复）
upper_tri = corr_matrix.where(
    np.triu(np.ones(corr_matrix.shape), k=1).astype(bool)
)

for col in upper_tri.columns:
    # any() 检查这一列是否有 True
    if (upper_tri[col] > 0.95).any():
        high_corr_cols.append(col)

print(f'高度相关的特征（建议删除）: {high_corr_cols}')

# 删除高度相关的特征
df_selected = df_scaled.drop(columns=high_corr_cols)
# drop(columns=...) 删除指定的列
```

### 4.3 方法三：SelectKBest（用统计检验选择最佳特征）

这个方法需要标签（target）。因为我们还没有标签，**这一步放在聚类之后做**（见第 7 节）。这里先给出代码，后面直接用：

```python
# 假设 y 是标签（后面聚类会创建）
# selector = SelectKBest(score_func=f_classif, k=15)
# # f_classif 是 ANOVA F 检验，k=15 表示选 15 个最好的特征
# X_selected = selector.fit_transform(X, y)
#
# # 查看选中的特征
# selected_mask = selector.get_support()
# selected_features = X.columns[selected_mask].tolist()
# print(f'选中的特征: {selected_features}')
#
# # 每个特征的得分
# feature_scores = pd.DataFrame({
#     '特征': X.columns,
#     '得分': selector.scores_
# }).sort_values('得分', ascending=False)
# print(feature_scores)
```

### 4.4 方法四：PCA 降维

PCA 不是选择原有特征，而是创造新的"组合特征"。适合可视化或作为模型输入。

```python
# 先看需要多少主成分才能保留 95% 的信息
pca = PCA()
pca.fit(df_scaled)

# 画累计解释方差图
plt.figure(figsize=(10, 6))
plt.plot(range(1, len(pca.explained_variance_ratio_) + 1),
         np.cumsum(pca.explained_variance_ratio_), 'bo-')
# cumsum 是累计求和
plt.axhline(y=0.95, color='r', linestyle='--', label='95% 阈值')
plt.xlabel('主成分数量')
plt.ylabel('累计解释方差比例')
plt.legend()
plt.show()

# 根据图选择合适的主成分数量，比如 10
pca = PCA(n_components=10)
df_pca = pca.fit_transform(df_scaled)
df_pca = pd.DataFrame(df_pca, columns=[f'PC{i+1}' for i in range(10)])
# [f'PC{i+1}' for i in range(10)] 生成 ['PC1', 'PC2', ..., 'PC10']

print(f'前 10 个主成分保留了 {pca.explained_variance_ratio_.sum():.2%} 的信息')
# :.2% 表示以百分比形式显示，保留两位小数
```

> **PCA 的缺点：** 新特征 `PC1, PC2...` 是原始特征的线性组合，不容易解释。决策树规则提取时不要用 PCA。

---

## 5. KMeans 聚类

### 5.1 什么是 KMeans

- **无监督学习**：不需要标签，算法自动发现数据中的分组
- **核心思想**：把数据点分到 K 个簇中，每个点到它所属簇中心的距离最小
- **你需要提前告诉算法 K 是多少**（几个簇）

### 5.2 确定最佳 K 值：肘部法则

```python
# 尝试 K=1 到 K=15，记录每个 K 的误差
inertia_list = []  # 惯性值，即所有点到其簇中心距离的平方和

for k in range(1, 16):
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    # n_clusters=k：想要分几个簇
    # random_state=42：固定随机种子，让结果可复现
    # n_init=10：用不同初始点跑 10 次，选最好的
    kmeans.fit(df_scaled)
    inertia_list.append(kmeans.inertia_)

# 画肘部图
plt.figure(figsize=(10, 6))
plt.plot(range(1, 16), inertia_list, 'bo-')
plt.xlabel('K 值（簇的数量）')
plt.ylabel('惯性值（Inertia）')
plt.title('肘部法则 - 选择最佳 K 值')
plt.show()
```

> **怎么看肘部图？**
> - 曲线下降速度从"陡"变"缓"的那个拐点，就是最佳 K 值
> - 像人的手臂肘部一样，所以叫"肘部法则"
> - 如果看不清楚拐点，用下面的轮廓系数辅助判断

### 5.3 用轮廓系数验证

```python
from sklearn.metrics import silhouette_score

silhouette_scores = []

for k in range(2, 11):  # 轮廓系数需要至少 2 个簇
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(df_scaled)
    # fit_predict 既训练又返回标签
    score = silhouette_score(df_scaled, labels)
    silhouette_scores.append(score)

# 画轮廓系数图
plt.figure(figsize=(10, 6))
plt.plot(range(2, 11), silhouette_scores, 'ro-')
plt.xlabel('K 值')
plt.ylabel('轮廓系数')
plt.title('轮廓系数 - 选择最佳 K 值')
plt.show()

# 最佳 K 值
best_k = range(2, 11)[np.argmax(silhouette_scores)]
print(f'轮廓系数最高的 K 值: {best_k}')
```

> **轮廓系数取值范围 -1 到 1，越接近 1 表示聚类质量越好。**

### 5.4 执行最终 KMeans

```python
# 用你确定的 K 值（这里假设 K=3，根据你的肘部图和轮廓系数调整）
k_best = 3
kmeans = KMeans(n_clusters=k_best, random_state=42, n_init=10)
kmeans_labels = kmeans.fit_predict(df_scaled)

# 查看每个簇有多少样本
unique, counts = np.unique(kmeans_labels, return_counts=True)
# np.unique 返回不重复的值和它们的计数
for cluster, count in zip(unique, counts):
    print(f'簇 {cluster}: {count} 个样本 ({count/len(kmeans_labels)*100:.1f}%)')

# 把聚类标签加到数据中
df['kmeans_cluster'] = kmeans_labels
df_scaled['kmeans_cluster'] = kmeans_labels
```

### 5.5 可视化聚类结果（用 PCA 降到 2 维）

```python
# 降到 2 维便于画图
pca_2d = PCA(n_components=2)
df_2d = pca_2d.fit_transform(df_scaled.drop(columns=['kmeans_cluster']))

plt.figure(figsize=(10, 8))
scatter = plt.scatter(df_2d[:, 0], df_2d[:, 1],
                      c=kmeans_labels, cmap='viridis', alpha=0.6, s=10)
# c：颜色依据，cmap：颜色主题，alpha：透明度，s：点的大小
plt.colorbar(scatter, label='簇')
plt.xlabel(f'PC1 ({pca_2d.explained_variance_ratio_[0]:.1%})')
plt.ylabel(f'PC2 ({pca_2d.explained_variance_ratio_[1]:.1%})')
plt.title('KMeans 聚类结果 (PCA 2D 可视化)')
plt.show()
```

### 5.6 分析每个簇的特征

```python
# 按簇分组，看每一列在不同簇中的均值
cluster_profile = df.groupby('kmeans_cluster').mean()
# groupby().mean() 按某个列分组，然后计算其他列的均值
print(cluster_profile.T)  # .T 转置，行变列，方便看

# 画出每个簇的特征雷达图（选几个重要特征）
# 或画箱线图看某个特征在不同簇中的分布
fig, axes = plt.subplots(2, 3, figsize=(15, 10))
axes = axes.flatten()
# 选 6 个特征画分布
for i, col in enumerate(df.columns[:6]):
    df.boxplot(column=col, by='kmeans_cluster', ax=axes[i])
    axes[i].set_title(col)
    axes[i].set_xlabel('簇')
plt.suptitle('')
plt.tight_layout()
plt.show()
```

---

## 6. DBSCAN 聚类

### 6.1 什么是 DBSCAN

- **不需要预先指定簇的数量**（和 KMeans 最大的区别）
- 基于密度：密集区域形成簇，稀疏区域被认为是噪声
- 可以发现**任意形状**的簇，不像 KMeans 只能找球形簇
- 会把离群点标记为噪声（标签 = -1）

### 6.2 两个关键参数

| 参数 | 含义 | 调参方向 |
|------|------|----------|
| `eps` | 邻域半径。两个点距离 < eps 才算邻居 | 太小 → 大部分点变成噪声；太大 → 所有点合成一个簇 |
| `min_samples` | 核心点所需的最小邻居数 | 太小 → 噪声变多；太大 → 簇变少 |

### 6.3 确定 eps 参数（k 距离图）

```python
from sklearn.neighbors import NearestNeighbors

# 找每个点的第 k 近邻的距离
k = 5  # 一般用 min_samples 的值
neigh = NearestNeighbors(n_neighbors=k)
neigh.fit(df_scaled)
distances, _ = neigh.kneighbors(df_scaled)
# distances 每一行是该点的 k 个最近邻居的距离
# 我们取第 k 近的距离（即最远的那个邻居的距离）
k_distances = np.sort(distances[:, -1])  # [:, -1] 取最后一列，即第 k 近的距离

# 画 k 距离图
plt.figure(figsize=(12, 6))
plt.plot(k_distances)
plt.xlabel('数据点（按距离排序）')
plt.ylabel(f'到第 {k} 近邻的距离')
plt.title('K-距离图（用于选择 eps）')
plt.axhline(y=np.percentile(k_distances, 90), color='r', linestyle='--',
            label='90% 分位数')
plt.legend()
plt.show()
```

> **怎么看 K-距离图？**
> - 找曲线"拐弯"的地方，对应的纵轴值就是 eps 的建议值
> - 曲线陡峭上升的起点通常是合适的 eps

### 6.4 执行 DBSCAN

```python
# 根据 K-距离图选择合适的 eps（这里用 0.5 做示例，请根据你的图调整）
dbscan = DBSCAN(eps=0.5, min_samples=10)
dbscan_labels = dbscan.fit_predict(df_scaled)

# 查看结果
n_clusters = len(set(dbscan_labels)) - (1 if -1 in dbscan_labels else 0)
n_noise = list(dbscan_labels).count(-1)
print(f'发现的簇数量: {n_clusters}')
print(f'噪声点数量: {n_noise} ({n_noise/len(dbscan_labels)*100:.1f}%)')

# 每个簇的样本数
for label in sorted(set(dbscan_labels)):
    count = list(dbscan_labels).count(label)
    if label == -1:
        print(f'噪声: {count} 个样本')
    else:
        print(f'簇 {label}: {count} 个样本')
```

### 6.5 调整参数重试

```python
# 如果簇太少或噪声太多，调整参数：
# 增大 eps → 更多点被包含，簇变大变少
# 减小 eps → 更严格的邻域条件，簇变小变多，噪声增加
# 减小 min_samples → 更容易形成簇
# 增大 min_samples → 更难形成簇

# 尝试不同参数组合
param_list = [
    (0.3, 5), (0.5, 5), (0.7, 5),
    (0.3, 10), (0.5, 10), (0.7, 10),
    (1.0, 10), (1.5, 10),
]

for eps, min_samp in param_list:
    db = DBSCAN(eps=eps, min_samples=min_samp)
    labels = db.fit_predict(df_scaled)
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = list(labels).count(-1)
    print(f'eps={eps}, min_samples={min_samp}: '
          f'{n_clusters} 个簇, {n_noise} 个噪声点')

# 选最好的一组参数做最终结果
dbscan = DBSCAN(eps=你选的eps, min_samples=你选的min_samples)
dbscan_labels = dbscan.fit_predict(df_scaled)

# 保存标签
df['dbscan_cluster'] = dbscan_labels
df_scaled['dbscan_cluster'] = dbscan_labels
```

### 6.6 可视化 DBSCAN 结果

```python
# 降到 2 维画图
pca_db = PCA(n_components=2)
df_db_2d = pca_db.fit_transform(df_scaled.drop(columns=['dbscan_cluster', 'kmeans_cluster'],
                                                 errors='ignore'))

plt.figure(figsize=(10, 8))
# 噪声点用黑色，其他用不同颜色
scatter = plt.scatter(df_db_2d[:, 0], df_db_2d[:, 1],
                      c=dbscan_labels, cmap='tab10', alpha=0.6, s=10)
plt.colorbar(scatter, label='簇 (-1 表示噪声)')
plt.xlabel(f'PC1')
plt.ylabel(f'PC2')
plt.title('DBSCAN 聚类结果 (PCA 2D 可视化)')
plt.show()
```

---

## 7. 用聚类结果构建分类任务

由于原始数据没有标签，我们用 KMeans 的聚类结果作为"伪标签"来做监督学习。这是一种**半监督学习**的思路。

### 7.1 准备 X 和 y

```python
# X：特征矩阵（所有 31 列原始特征）
X = df_scaled.drop(columns=['kmeans_cluster', 'dbscan_cluster'], errors='ignore')

# y：标签（用 KMeans 的聚类结果）
y = df_scaled['kmeans_cluster'].astype(int)
# astype(int) 把标签转成整数

# 如果 KMeans 结果不好，尝试用 DBSCAN 的标签
# 但要去掉噪声点（标签=-1）
# mask = df['dbscan_cluster'] != -1
# X = X[mask]
# y = df['dbscan_cluster'][mask].astype(int)

print(f'X 的形状: {X.shape}')
print(f'y 的形状: {y.shape}')
print(f'y 的分布:\n{y.value_counts()}')
# value_counts() 统计每个值出现了多少次
```

### 7.2 划分训练集和测试集

```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,      # 20% 的数据用于测试
    random_state=42,     # 固定随机种子
    stratify=y           # 保持训练集和测试集的类别比例一致
)
# train_test_split 返回 4 个值，按顺序接收
# X_train：训练集特征
# X_test：测试集特征
# y_train：训练集标签
# y_test：测试集标签

print(f'训练集: {X_train.shape[0]} 个样本')
print(f'测试集: {X_test.shape[0]} 个样本')
```

### 7.3 特征选择（现在有标签了）

```python
# ========== SelectKBest：选最好的 K 个特征 ==========
selector = SelectKBest(score_func=f_classif, k=15)
# f_classif 使用 ANOVA F 检验
selector.fit(X_train, y_train)

# 每个特征的得分，按从高到低排序
feature_scores = pd.DataFrame({
    '特征': X.columns,
    'F值': selector.scores_,
    'P值': selector.pvalues_
}).sort_values('F值', ascending=False)
print('特征重要性排名（前15）:')
print(feature_scores.head(15))

# 获取选中的特征
selected_features = X.columns[selector.get_support()].tolist()
print(f'\n选中的特征: {selected_features}')

# 用选中的特征重新构造数据
X_train_selected = selector.transform(X_train)
X_test_selected = selector.transform(X_test)
print(f'特征选择后的形状: {X_train_selected.shape}')
```

> **知识点：F 值和 P 值**
> - F 值越大，说明这个特征在不同类别之间的差异越大，区分能力越强
> - P 值越小（通常 < 0.05），说明这个差异是"统计显著"的，不是随机造成的

### 7.4 还有另一种特征选择法：基于随机森林

```python
# 随机森林可以给出特征重要性
rf = RandomForestClassifier(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)

# 特征重要性
feature_importance = pd.DataFrame({
    '特征': X.columns,
    '重要性': rf.feature_importances_
}).sort_values('重要性', ascending=False)
print('随机森林特征重要性排名（前15）:')
print(feature_importance.head(15))

# 画特征重要性图
plt.figure(figsize=(12, 8))
plt.barh(feature_importance['特征'][:15][::-1],
         feature_importance['重要性'][:15][::-1])
# [::-1] 反转顺序，让最大的在上面
plt.xlabel('重要性')
plt.title('随机森林 - 特征重要性 Top 15')
plt.tight_layout()
plt.show()
```

---

## 8. SVM 支持向量机

### 8.1 什么是 SVM

- 找一个**超平面**（决策边界），把不同类别的样本分开
- 核心概念：**最大间隔**——让边界离最近的样本点尽可能远
- 通过**核函数**（kernel）可以处理非线性可分的数据

### 8.2 训练基础 SVM

```python
# 创建 SVM 分类器
svm = SVC(kernel='rbf',          # 核函数：'rbf'（高斯核）、'linear'（线性）、'poly'（多项式）
          C=1.0,                  # 正则化参数：越大越不允许分错，越小容错越多
          gamma='scale',          # 核函数系数：'scale' 自动计算，'auto' 或用数值
          random_state=42)

# 训练
svm.fit(X_train_selected, y_train)

# 预测
y_pred_svm = svm.predict(X_test_selected)

# 计算准确率
accuracy_svm = accuracy_score(y_test, y_pred_svm)
print(f'SVM 准确率: {accuracy_svm:.4f} ({accuracy_svm*100:.2f}%)')
# :.4f 表示保留 4 位小数
```

### 8.3 详细评估

```python
# 分类报告（精确率、召回率、F1 分数）
print('\n分类报告:')
print(classification_report(y_test, y_pred_svm))

# 混淆矩阵
cm = confusion_matrix(y_test, y_pred_svm)
print('\n混淆矩阵:')
print(cm)

# 画混淆矩阵热力图
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
# annot=True 显示数字，fmt='d' 整数格式
plt.xlabel('预测标签')
plt.ylabel('真实标签')
plt.title(f'SVM 混淆矩阵 (Accuracy: {accuracy_svm:.2%})')
plt.show()
```

> **知识点：分类报告各项含义**
> - **Precision（精确率）**：预测为 A 类的样本中，有多少真的是 A 类。高了说明不乱报
> - **Recall（召回率）**：真正的 A 类样本中，有多少被找到了。高了说明不漏报
> - **F1-score**：精确率和召回率的调和平均，综合评价指标
> - **Support**：该类别的样本数

### 8.4 调参（网格搜索）

```python
# 定义要尝试的参数组合
param_grid = {
    'C': [0.1, 1, 10, 100],
    'gamma': ['scale', 'auto', 0.1, 0.01, 0.001],
    'kernel': ['rbf', 'linear']
}

# 网格搜索
grid_svm = GridSearchCV(
    SVC(random_state=42),
    param_grid,
    cv=3,              # 3 折交叉验证
    scoring='accuracy', # 用准确率作为评价标准
    n_jobs=-1,          # 并行计算，-1 表示用所有 CPU
    verbose=1           # 显示进度
)
grid_svm.fit(X_train_selected, y_train)

print(f'最佳参数: {grid_svm.best_params_}')
print(f'最佳交叉验证准确率: {grid_svm.best_score_:.4f}')

# 用最佳模型预测
y_pred_best_svm = grid_svm.best_estimator_.predict(X_test_selected)
accuracy_best_svm = accuracy_score(y_test, y_pred_best_svm)
print(f'调参后 SVM 测试集准确率: {accuracy_best_svm:.4f}')
```

> **知识点：交叉验证**
> - 把训练集分成 3 份，每次用 2 份训练、1 份验证，轮流 3 次
> - 取 3 次的平均准确率作为这个参数组合的得分
> - 避免因为一次随机划分导致结果偶然

---

## 9. XGBoost

### 9.1 什么是 XGBoost

- **梯度提升树**：通过不断添加决策树来修正前一轮的错误
- **特点**：速度快、效果好、自带正则化防止过拟合
- Kaggle 比赛中的"常胜将军"

### 9.2 训练 XGBoost

```python
# 创建 XGBoost 分类器
xgb = XGBClassifier(
    n_estimators=100,       # 树的数量
    max_depth=6,            # 每棵树的最大深度
    learning_rate=0.1,      # 学习率（每棵树的贡献权重）
    subsample=0.8,          # 每棵树随机采样 80% 的数据
    colsample_bytree=0.8,   # 每棵树随机采样 80% 的特征
    random_state=42,
    eval_metric='mlogloss', # 评估指标：多分类对数损失
    use_label_encoder=False # 新版 xgboost 需要这个
)

# 训练
xgb.fit(X_train_selected, y_train)

# 预测
y_pred_xgb = xgb.predict(X_test_selected)
accuracy_xgb = accuracy_score(y_test, y_pred_xgb)
print(f'XGBoost 准确率: {accuracy_xgb:.4f} ({accuracy_xgb*100:.2f}%)')

print('\n分类报告:')
print(classification_report(y_test, y_pred_xgb))
```

### 9.3 XGBoost 特征重要性

```python
# 画特征重要性
plt.figure(figsize=(12, 8))
# xgb.feature_importances_ 给出每个特征的重要性分数
importance_df = pd.DataFrame({
    '特征': selected_features,
    '重要性': xgb.feature_importances_
}).sort_values('重要性', ascending=True)

plt.barh(importance_df['特征'], importance_df['重要性'])
plt.xlabel('重要性')
plt.title('XGBoost 特征重要性')
plt.tight_layout()
plt.show()
```

### 9.4 XGBoost 调参

```python
# 简化版网格搜索
param_grid_xgb = {
    'max_depth': [3, 5, 7],
    'learning_rate': [0.01, 0.1, 0.3],
    'n_estimators': [100, 200],
}

grid_xgb = GridSearchCV(
    XGBClassifier(random_state=42, eval_metric='mlogloss', use_label_encoder=False),
    param_grid_xgb,
    cv=3,
    scoring='accuracy',
    n_jobs=-1,
    verbose=1
)
grid_xgb.fit(X_train_selected, y_train)

print(f'最佳参数: {grid_xgb.best_params_}')
print(f'最佳交叉验证准确率: {grid_xgb.best_score_:.4f}')

best_xgb = grid_xgb.best_estimator_
y_pred_best_xgb = best_xgb.predict(X_test_selected)
accuracy_best_xgb = accuracy_score(y_test, y_pred_best_xgb)
print(f'调参后 XGBoost 准确率: {accuracy_best_xgb:.4f}')
```

---

## 10. LightGBM

### 10.1 什么是 LightGBM

- 和 XGBoost 类似的梯度提升树，但训练速度更快
- 使用**直方图算法**：把连续特征离散化，大幅减少计算量
- 使用**叶子优先**的生长策略，适合处理大规模数据

### 10.2 训练 LightGBM

```python
# 创建 LightGBM 分类器
lgb = LGBMClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbose=-1  # -1 表示不输出训练信息
)

# 训练
lgb.fit(X_train_selected, y_train)

# 预测
y_pred_lgb = lgb.predict(X_test_selected)
accuracy_lgb = accuracy_score(y_test, y_pred_lgb)
print(f'LightGBM 准确率: {accuracy_lgb:.4f} ({accuracy_lgb*100:.2f}%)')

print('\n分类报告:')
print(classification_report(y_test, y_pred_lgb))
```

### 10.3 LightGBM 特征重要性

```python
plt.figure(figsize=(12, 8))
importance_lgb = pd.DataFrame({
    '特征': selected_features,
    '重要性': lgb.feature_importances_
}).sort_values('重要性', ascending=True)

plt.barh(importance_lgb['特征'], importance_lgb['重要性'])
plt.xlabel('重要性')
plt.title('LightGBM 特征重要性')
plt.tight_layout()
plt.show()
```

### 10.4 LightGBM 调参

```python
param_grid_lgb = {
    'max_depth': [3, 5, 7],
    'learning_rate': [0.01, 0.1, 0.3],
    'n_estimators': [100, 200],
    'num_leaves': [31, 63, 127],  # LightGBM 特有参数，控制叶子数量
}

grid_lgb = GridSearchCV(
    LGBMClassifier(random_state=42, verbose=-1),
    param_grid_lgb,
    cv=3,
    scoring='accuracy',
    n_jobs=-1,
    verbose=1
)
grid_lgb.fit(X_train_selected, y_train)

print(f'最佳参数: {grid_lgb.best_params_}')
best_lgb = grid_lgb.best_estimator_
y_pred_best_lgb = best_lgb.predict(X_test_selected)
accuracy_best_lgb = accuracy_score(y_test, y_pred_best_lgb)
print(f'调参后 LightGBM 准确率: {accuracy_best_lgb:.4f}')
```

---

## 11. CatBoost

### 11.1 什么是 CatBoost

- 俄罗斯 Yandex 开发的梯度提升树
- **最大优势**：不需要手动处理类别特征，内置处理机制
- 使用**排序提升**减少过拟合
- 默认参数就能得到不错的效果

### 11.2 训练 CatBoost

```python
# 创建 CatBoost 分类器
cat = CatBoostClassifier(
    iterations=100,          # 等同于 n_estimators
    depth=6,                 # 等同于 max_depth
    learning_rate=0.1,
    random_seed=42,
    verbose=0,               # 0 表示不输出训练信息
    thread_count=-1          # 使用所有 CPU 核心
)

# 训练
cat.fit(X_train_selected, y_train)

# 预测
y_pred_cat = cat.predict(X_test_selected)
# 注意：CatBoost 的 predict 返回的是 1D 数组，需要 ravel()
y_pred_cat = y_pred_cat.ravel()
accuracy_cat = accuracy_score(y_test, y_pred_cat)
print(f'CatBoost 准确率: {accuracy_cat:.4f} ({accuracy_cat*100:.2f}%)')

print('\n分类报告:')
print(classification_report(y_test, y_pred_cat))
```

### 11.3 CatBoost 特征重要性

```python
plt.figure(figsize=(12, 8))
importance_cat = pd.DataFrame({
    '特征': selected_features,
    '重要性': cat.feature_importances_
}).sort_values('重要性', ascending=True)

plt.barh(importance_cat['特征'], importance_cat['重要性'])
plt.xlabel('重要性')
plt.title('CatBoost 特征重要性')
plt.tight_layout()
plt.show()
```

---

## 12. 深度学习（MLP 多层感知机）

用 PyTorch 实现一个简单的全连接神经网络。

### 12.1 什么是 MLP

- 多层感知机（Multi-Layer Perceptron）是最基础的前馈神经网络
- **结构**：输入层 → 隐藏层（可以有多个）→ 输出层
- 每层之间全连接，通过激活函数（如 ReLU）引入非线性
- 用**反向传播**和**梯度下降**来训练

### 12.2 数据准备

```python
# PyTorch 需要 numpy 数组或 tensor
X_train_tensor = torch.FloatTensor(X_train_selected)
# FloatTensor：浮点数张量
y_train_tensor = torch.LongTensor(y_train.values)
# LongTensor：整数张量（用于分类标签）
X_test_tensor = torch.FloatTensor(X_test_selected)
y_test_tensor = torch.LongTensor(y_test.values)

# 创建 DataLoader（批量加载数据）
train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
# TensorDataset 把特征和标签打包在一起
test_dataset = TensorDataset(X_test_tensor, y_test_tensor)

train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
# batch_size=64：每次取 64 个样本训练
# shuffle=True：每个 epoch 打乱数据顺序
test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)
```

### 12.3 定义网络结构

```python
class MLP(nn.Module):
    """多层感知机"""
    def __init__(self, input_dim, hidden_dim, output_dim):
        super(MLP, self).__init__()
        # nn.Sequential 把多个层串在一起
        self.model = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),   # 全连接层 1：输入 → 隐藏
            nn.ReLU(),                            # ReLU 激活函数
            nn.Dropout(0.3),                      # Dropout：随机丢弃 30% 神经元，防过拟合
            nn.Linear(hidden_dim, hidden_dim),  # 全连接层 2：隐藏 → 隐藏
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, output_dim)   # 全连接层 3：隐藏 → 输出
        )

    def forward(self, x):
        # 前向传播：数据从输入到输出的流向
        return self.model(x)

# 实例化模型
input_dim = X_train_selected.shape[1]  # 输入维度 = 特征数量
hidden_dim = 128                         # 隐藏层神经元数量（可调整）
output_dim = len(np.unique(y))           # 输出维度 = 类别数量

model = MLP(input_dim, hidden_dim, output_dim)
print(model)
```

> **知识点：各组件作用**
> - `nn.Linear(a, b)`：全连接层，把 a 维输入变成 b 维输出，公式 `y = Wx + b`
> - `nn.ReLU()`：激活函数 `f(x) = max(0, x)`，引入非线性，否则多层等于一层
> - `nn.Dropout(p)`：训练时随机把 p 比例的神经元输出设为 0，防止过拟合
> - 输出层没有激活函数，因为 `CrossEntropyLoss` 内置了 softmax

### 12.4 定义损失函数和优化器

```python
# 损失函数：交叉熵（分类问题的标准选择）
criterion = nn.CrossEntropyLoss()
# CrossEntropyLoss = log(Softmax) + NLLLoss
# 它会自动对模型输出做 softmax 再计算损失

# 优化器：Adam（目前最常用的优化器）
optimizer = optim.Adam(model.parameters(), lr=0.001)
# model.parameters() 返回模型所有可训练的参数
# lr=0.001 是学习率
```

### 12.5 训练模型

```python
num_epochs = 50  # 完整遍历整个训练集的次数
train_losses = []
test_accuracies = []

for epoch in range(num_epochs):
    # ===== 训练阶段 =====
    model.train()  # 切换到训练模式（启用 Dropout）
    total_loss = 0

    for batch_X, batch_y in train_loader:
        # 前向传播
        outputs = model(batch_X)
        loss = criterion(outputs, batch_y)

        # 反向传播（三大步骤）
        optimizer.zero_grad()   # 1. 清空之前的梯度
        loss.backward()         # 2. 计算梯度
        optimizer.step()        # 3. 更新参数

        total_loss += loss.item()
        # loss.item() 把 PyTorch 的 loss 值转成 Python 数字

    avg_loss = total_loss / len(train_loader)
    train_losses.append(avg_loss)

    # ===== 测试阶段 =====
    model.eval()  # 切换到评估模式（关闭 Dropout）
    correct = 0
    total = 0

    with torch.no_grad():  # 不计算梯度，节省内存和加速
        for batch_X, batch_y in test_loader:
            outputs = model(batch_X)
            _, predicted = torch.max(outputs, 1)
            # torch.max(outputs, 1) 返回 (最大值, 最大值的索引)
            # 索引就是预测的类别
            total += batch_y.size(0)
            correct += (predicted == batch_y).sum().item()

    accuracy = correct / total
    test_accuracies.append(accuracy)

    if (epoch + 1) % 10 == 0:  # 每 10 轮打印一次
        print(f'Epoch [{epoch+1}/{num_epochs}], '
              f'Loss: {avg_loss:.4f}, '
              f'Test Accuracy: {accuracy:.4f}')

print(f'\nMLP 最终测试准确率: {test_accuracies[-1]*100:.2f}%')
```

### 12.6 画训练曲线

```python
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# 损失曲线
ax1.plot(train_losses)
ax1.set_xlabel('Epoch')
ax1.set_ylabel('Loss')
ax1.set_title('训练损失曲线')

# 准确率曲线
ax2.plot(test_accuracies)
ax2.set_xlabel('Epoch')
ax2.set_ylabel('Accuracy')
ax2.set_title('测试准确率曲线')

plt.tight_layout()
plt.show()
```

---

## 13. 决策树规则提取

这是本任务的**最终目标**：从决策树中提取人类可以理解的"如果...那么..."规则。

### 13.1 什么是决策树

- 像**流程图**一样做决策
- 每个节点根据一个特征的取值分叉
- 最终叶子节点给出分类结果
- 两种分裂标准：
  - **Entropy（信息熵）**：衡量"不确定性"，选择能让不确定性降低最多的特征来分裂
  - **Gini（基尼系数）**：衡量"不纯度"，选择能让节点变得更纯的特征来分裂

### 13.2 用 Entropy 训练决策树

```python
# ===== Entropy 决策树 =====
dt_entropy = DecisionTreeClassifier(
    criterion='entropy',    # 用信息增益（基于熵）来分裂
    max_depth=5,            # 树的最大深度（限制深度可以防止过拟合，也让规则更简洁）
    min_samples_split=50,   # 一个节点至少要有 50 个样本才能继续分裂
    min_samples_leaf=20,    # 叶子节点至少要有 20 个样本
    random_state=42
)

dt_entropy.fit(X_train_selected, y_train)

# 预测和评估
y_pred_entropy = dt_entropy.predict(X_test_selected)
accuracy_entropy = accuracy_score(y_test, y_pred_entropy)
print(f'决策树 (Entropy) 准确率: {accuracy_entropy:.4f} ({accuracy_entropy*100:.2f}%)')
print(f'树的深度: {dt_entropy.get_depth()}')
print(f'叶子节点数量: {dt_entropy.get_n_leaves()}')
```

### 13.3 用 Gini 训练决策树

```python
# ===== Gini 决策树 =====
dt_gini = DecisionTreeClassifier(
    criterion='gini',       # 用基尼系数来分裂
    max_depth=5,
    min_samples_split=50,
    min_samples_leaf=20,
    random_state=42
)

dt_gini.fit(X_train_selected, y_train)

y_pred_gini = dt_gini.predict(X_test_selected)
accuracy_gini = accuracy_score(y_test, y_pred_gini)
print(f'决策树 (Gini) 准确率: {accuracy_gini:.4f} ({accuracy_gini*100:.2f}%)')
print(f'树的深度: {dt_gini.get_depth()}')
print(f'叶子节点数量: {dt_gini.get_n_leaves()}')
```

### 13.4 导出文本规则

```python
# 用特征的原始名字导出规则
# export_text 把决策树转成可读的文本规则
rules_entropy = export_text(dt_entropy,
                            feature_names=list(selected_features))
print("=" * 60)
print("===== Entropy 决策树规则 =====")
print("=" * 60)
print(rules_entropy)

print("\n\n")

rules_gini = export_text(dt_gini,
                         feature_names=list(selected_features))
print("=" * 60)
print("===== Gini 决策树规则 =====")
print("=" * 60)
print(rules_gini)
```

> **怎么读规则？**
> ```
> |--- feature_5 <= 0.50
> |   |--- feature_3 <= -1.20
> |   |   |--- class: 0
> |   |--- feature_3 > -1.20
> |   |   |--- class: 1
> |--- feature_5 > 0.50
> |   |--- class: 2
> ```
> 翻译成人话：
> - 如果 feature_5 ≤ 0.50 且 feature_3 ≤ -1.20，则预测为类别 0
> - 如果 feature_5 ≤ 0.50 且 feature_3 > -1.20，则预测为类别 1
> - 如果 feature_5 > 0.50，则预测为类别 2

### 13.5 可视化决策树

```python
# ===== 画 Entropy 决策树 =====
plt.figure(figsize=(25, 15))
plot_tree(dt_entropy,
          feature_names=list(selected_features),
          class_names=[f'类别{i}' for i in sorted(y.unique())],
          filled=True,           # 用颜色填充节点
          rounded=True,          # 圆角节点
          fontsize=10,
          proportion=True)       # 按比例显示样本数
plt.title('决策树 (Entropy / 信息熵)', fontsize=16)
plt.tight_layout()
plt.savefig('decision_tree_entropy.png', dpi=150)  # 保存图片
plt.show()

# ===== 画 Gini 决策树 =====
plt.figure(figsize=(25, 15))
plot_tree(dt_gini,
          feature_names=list(selected_features),
          class_names=[f'类别{i}' for i in sorted(y.unique())],
          filled=True,
          rounded=True,
          fontsize=10,
          proportion=True)
plt.title('决策树 (Gini / 基尼系数)', fontsize=16)
plt.tight_layout()
plt.savefig('decision_tree_gini.png', dpi=150)
plt.show()
```

> **图片解释**
> - 每个节点的第一行：分裂条件
> - `samples`：该节点的样本数
> - `value`：每个类别的样本数分布
> - `class`：该节点预测的类别
> - 颜色越深表示该节点的"纯度"越高

### 13.6 特征重要性分析

```python
# 比较 Entropy 和 Gini 树的特征重要性
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))

# df[::1] 反转顺序，让高的在上
imp_entropy = pd.DataFrame({
    '特征': list(selected_features),
    '重要性': dt_entropy.feature_importances_
}).sort_values('重要性', ascending=True)

ax1.barh(imp_entropy['特征'], imp_entropy['重要性'])
ax1.set_title('Entropy 决策树 - 特征重要性')
ax1.set_xlabel('重要性')

imp_gini = pd.DataFrame({
    '特征': list(selected_features),
    '重要性': dt_gini.feature_importances_
}).sort_values('重要性', ascending=True)

ax2.barh(imp_gini['特征'], imp_gini['重要性'])
ax2.set_title('Gini 决策树 - 特征重要性')
ax2.set_xlabel('重要性')

plt.tight_layout()
plt.show()
```

### 13.7 不同深度的决策树对比

```python
# 看看不同 max_depth 对准确率的影响
depths = range(2, 16)
entropy_scores = []
gini_scores = []

for d in depths:
    dt_e = DecisionTreeClassifier(criterion='entropy', max_depth=d, random_state=42)
    dt_e.fit(X_train_selected, y_train)
    entropy_scores.append(accuracy_score(y_test, dt_e.predict(X_test_selected)))

    dt_g = DecisionTreeClassifier(criterion='gini', max_depth=d, random_state=42)
    dt_g.fit(X_train_selected, y_train)
    gini_scores.append(accuracy_score(y_test, dt_g.predict(X_test_selected)))

plt.figure(figsize=(12, 6))
plt.plot(depths, entropy_scores, 'bo-', label='Entropy')
plt.plot(depths, gini_scores, 'ro-', label='Gini')
plt.xlabel('max_depth（树的最大深度）')
plt.ylabel('准确率')
plt.title('不同深度下的决策树准确率对比')
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()
```

### 13.8 深入理解：Entropy vs Gini 的计算原理

这两个公式不需要你手动算，但要理解它们的含义：

| 概念 | Entropy | Gini |
|------|---------|------|
| **公式** | $-\sum p_i \cdot \log_2(p_i)$ | $1 - \sum p_i^2$ |
| **含义** | 信息的不确定性 | 随机抽两个样本，它们不同类的概率 |
| **范围** | 0 到 $\log_2(K)$（K=类别数） | 0 到 $1 - 1/K$ |
| **值为 0 时** | 节点里的样本全是一个类（最纯） | 节点里的样本全是一个类（最纯） |
| **值最大时** | 每个类比例相等（最混乱） | 每个类比例相等（最混乱） |
| **区别** | Entropy 对不纯度惩罚更重 | Gini 计算更快，结果通常相似 |

> **实际例子**：一个节点有 100 个样本，50 个类别 0，50 个类别 1
> - $\text{Entropy} = -(0.5 \times \log_2 0.5 + 0.5 \times \log_2 0.5) = 1.0$（最高熵）
> - $\text{Gini} = 1 - (0.5^2 + 0.5^2) = 0.5$（最高基尼不纯度）

---

## 14. 模型对比总结

### 14.1 汇总所有模型的准确率

```python
# 把所有模型的准确率放在一起比较
results = pd.DataFrame({
    '模型': [
        'SVM',
        'SVM (调参后)',
        'XGBoost',
        'XGBoost (调参后)',
        'LightGBM',
        'LightGBM (调参后)',
        'CatBoost',
        'MLP (深度学习)',
        '决策树 (Entropy)',
        '决策树 (Gini)',
    ],
    '准确率': [
        accuracy_svm,
        accuracy_best_svm,
        accuracy_xgb,
        accuracy_best_xgb,
        accuracy_lgb,
        accuracy_best_lgb,
        accuracy_cat,
        test_accuracies[-1],  # MLP 最后一轮的准确率
        accuracy_entropy,
        accuracy_gini,
    ]
})

# 按准确率排序
results = results.sort_values('准确率', ascending=False).reset_index(drop=True)
# reset_index(drop=True) 重置 index 从 0 开始

print(results)

# 画柱状图对比
plt.figure(figsize=(14, 6))
colors = plt.cm.Set2(range(len(results)))
bars = plt.bar(results['模型'], results['准确率'] * 100, color=colors)

# 在柱子上写数值
for bar, acc in zip(bars, results['准确率']):
    plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
             f'{acc*100:.1f}%', ha='center', fontsize=11)

plt.ylabel('准确率 (%)')
plt.title('所有模型准确率对比')
plt.xticks(rotation=45, ha='right')
plt.ylim(0, max(results['准确率'] * 100) * 1.15)
plt.tight_layout()
plt.show()
```

### 14.2 完整流程图总结

```
bcg_data.csv (10890行 × 31列)
        │
        ▼
  ① 数据加载与探索
     df.head(), df.describe(), df.isnull().sum(), 画直方图、热力图
        │
        ▼
  ② 数据预处理
     缺失值填充 → 标准化 (StandardScaler) → df_scaled
        │
        ▼
  ③ 无监督聚类
     ├── KMeans (需要选 K 值 → 肘部法则 + 轮廓系数)
     └── DBSCAN (需要调 eps/min_samples → K-距离图)
        │
        ▼  (以 KMeans 聚类结果为伪标签)
  ④ 划分训练集/测试集 (train_test_split, 80/20)
        │
        ▼
  ⑤ 特征选择
     SelectKBest (F检验) + 随机森林特征重要性
        │
        ▼
  ⑥ 训练多种分类器
     ├── SVM (RBF核, 网格搜索调参)
     ├── XGBoost (梯度提升, 调 max_depth/learning_rate)
     ├── LightGBM (直方图加速, 调 num_leaves)
     ├── CatBoost (排序提升, 自带抗过拟合)
     └── MLP (PyTorch, 3层全连接, ReLU+Dropout)
        │
        ▼
  ⑦ 决策树规则提取
     ├── Entropy 决策树 → export_text() 导出文本规则
     └── Gini 决策树 → plot_tree() 可视化
        │
        ▼
  ⑧ 模型对比 → 汇总准确率表格 + 柱状图
```

### 14.3 常见问题排查

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| 准确率太低（< 50%） | 特征没选好或聚类 K 值不合适 | 尝试不同的 K 值，或检查特征选择 |
| KMeans 所有样本都分到一个簇 | K 值设成了 1，或数据尺度没归一化 | 确认已标准化，增大 K 值 |
| DBSCAN 全是噪声（标签=-1） | eps 太小 | 增大 eps，或减小 min_samples |
| DBSCAN 所有样本成一个簇 | eps 太大 | 减小 eps |
| SVM 训练非常慢 | 样本太多或特征太多 | 先用 PCA 降维，或减少样本量 |
| 决策树过拟合（训练集100%测试集很差） | max_depth 太大 | 减小 max_depth，增大 min_samples_split |
| CatBoost 报错 | 安装问题 | `pip install catboost --upgrade` |
| PyTorch 报 CUDA 错误 | 没有 GPU 或驱动问题 | 代码默认用 CPU，不需要 GPU |
| 模型准确率都差不多 | 聚类标签本身区分度不高 | 这是正常的，关注不同 K 值的结果 |

---

## 附录：Pandas 常用语法速查

| 操作 | 代码 | 说明 |
|------|------|------|
| 读取 CSV | `df = pd.read_csv('文件.csv')` | |
| 保存 CSV | `df.to_csv('文件.csv', index=False)` | index=False 不保存行号 |
| 看前几行 | `df.head(10)` | |
| 看行列数 | `df.shape` | 返回 (行数, 列数) |
| 看列名 | `df.columns.tolist()` | |
| 看数据类型 | `df.dtypes` | |
| 选一列 | `df['列名']` | 返回 Series |
| 选多列 | `df[['列1', '列2']]` | 注意两个方括号，返回 DataFrame |
| 选多行 | `df[10:20]` | 选第 10 到 19 行 |
| 按条件筛选 | `df[df['列名'] > 0]` | 选某列大于 0 的行 |
| 多个条件 | `df[(df['A'] > 0) & (df['B'] < 5)]` | & 表示且，| 表示或 |
| 删除列 | `df.drop(columns=['列1', '列2'])` | |
| 删除行 | `df.drop(index=[0, 1, 2])` | 删第 0,1,2 行 |
| 新增列 | `df['新列名'] = 值` | |
| 分组统计 | `df.groupby('列名').mean()` | 按某列分组求均值 |
| 统计频次 | `df['列名'].value_counts()` | |
| 判断空值 | `df.isnull().sum()` | 每列的缺失值数量 |
| 填充空值 | `df.fillna(值)` | |
| 描述统计 | `df.describe()` | 均值、标准差、最大最小值等 |
| 排序 | `df.sort_values('列名', ascending=False)` | ascending=False 降序 |
| 转置 | `df.T` | 行列互换 |
| 取唯一值 | `df['列名'].unique()` | |
| 相关系数 | `df.corr()` | 返回各列之间的相关系数矩阵 |
| 对每列应用函数 | `df.apply(函数)` | 如 `df.apply(np.mean)` |

---

> **最后提醒**：这份指南中所有的 Python 代码都可以直接运行。你需要做的是：
> 1. 把代码复制到一个 `.py` 文件（或 Jupyter Notebook）中
> 2. 按顺序从上到下执行
> 3. 观察每一步的输出，根据自己的数据调整参数（尤其是 KMeans 的 K 值、DBSCAN 的 eps、特征选择的 k 值）
> 4. 最后把决策树规则和图片保存下来，写入实验报告
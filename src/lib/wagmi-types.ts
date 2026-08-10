// 共享类型别名：组件 props 用得到时从这里取，避免 ReturnType<> 散落。
// 不导出 wagmi/viem 内部类型，只暴露我们用到的。

export type AccountStatus = 'connected' | 'reconnecting' | 'disconnected';

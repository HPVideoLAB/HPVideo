/**
 * lazyRender Action
 * 用于检测元素是否进入视口，专门解决长列表 Video/Image 渲染卡顿问题。
 *
 * 特性：
 * 1. 自动查找最近的滚动容器（root），无需手动传递 DOM 引用。
 * 2. 支持 rootMargin 预加载。
 * 3. 极其轻量，基于 IntersectionObserver。
 */

export function lazyRender(
  node: HTMLElement,
  params: {
    // 必须：唯一标识符
    id: string;
    // 必须：回调函数，告诉组件“我可见了”
    onVisible: (id: string) => void;
    // 可选：查找滚动容器的 CSS 选择器（默认找 .scroll-fade）
    rootSelector?: string;
    // 可选：预加载距离（默认 50px）
    rootMargin?: string;
  }
) {
  let observer: IntersectionObserver | null = null;

  // 使用 requestAnimationFrame 确保 DOM 已经挂载，能找到父级
  const cleanFrame = requestAnimationFrame(() => {
    // 1. 自动寻找最近的滚动容器
    // 如果你在其他地方用，记得给你的滚动容器加上 class="scroll-fade" 或者传入 rootSelector
    const scrollParent = node.closest(params.rootSelector || '.scroll-fade');

    // 2. 配置观察器
    const options = {
      root: scrollParent || null, // 找不到就降级为浏览器视口
      rootMargin: params.rootMargin || '50px', // 默认提前 50px 加载
      threshold: 0.01,
    };

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // 3. 触发回调
          params.onVisible(params.id);

          // 4. 可选：一旦可见就停止观察（性能最优，防止反复触发）
          // 如果你需要“滑出去就销毁”，请注释掉下面这行，并在组件里处理销毁逻辑
          observer?.unobserve(node);
        }
      });
    }, options);

    observer.observe(node);
  });

  return {
    destroy() {
      cancelAnimationFrame(cleanFrame);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
  };
}

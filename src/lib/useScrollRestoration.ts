import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getScrollCache, ScrollCacheData, setScrollCache } from './scrollCache';
import { DoubanItem } from './types';

export interface RestorableData {
  items: DoubanItem[];
  hasNextPage: boolean;
  primarySelection: string;
  secondarySelection: string;
  multiLevelValues: Record<string, string>;
  selectedWeekday: string;
}

interface UseScrollRestorationProps {
  dataRef: React.RefObject<RestorableData>;
  mainContainerRef?: React.RefObject<HTMLElement | null>;
  restoreState: (data: RestorableData) => void;
}

export const useScrollRestoration = ({
  dataRef,
  mainContainerRef,
  restoreState,
}: UseScrollRestorationProps) => {
  const pathname = usePathname();

  const cachedData = useMemo(() => getScrollCache(pathname), [pathname]);
  
  // 使用 state 来管理恢复状态，以便能自动解锁
  const [isRestoring, setIsRestoring] = useState(!!cachedData);

  const getScrollContainer = useCallback(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? document.body : mainContainerRef?.current;
  }, [mainContainerRef]);

  const areTopTextsRendered = (container: HTMLElement): boolean => {
    const texts = ['电影', '剧集', '综艺', '动漫', '儿童', '更多'];
    for (const text of texts) {
      if (container.innerText.includes(text)) {
        return true;
      }
    }
    return false;
  };

  // 此 Effect 仅负责调用 restoreState 和设置滚动条
  useEffect(() => {
    if (cachedData) {
      const container = getScrollContainer();
      if (!container) return; // Add a guard for null container

      restoreState(cachedData);

      // 应用滚动位置的函数
      const applyScroll = (scrollContainer: HTMLElement) => {
        if (scrollContainer.scrollTop !== cachedData.scrollPosition) {
          scrollContainer.scrollTop = cachedData.scrollPosition;
        }
      };

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      if (isMobile && container === document.body) {
        // For mobile and document.body, check for specific text rendering
        const observer = new MutationObserver((mutations, obs) => {
          if (areTopTextsRendered(container)) {
            applyScroll(container);
            obs.disconnect();
          }
        });

        observer.observe(container, { childList: true, subtree: true });

        return () => {
          observer.disconnect();
        };
      } else if (container.scrollHeight > container.clientHeight) {
        applyScroll(container);
      } else {
        // For desktop or mobile with mainContainerRef, use scrollHeight check
        const observer = new MutationObserver((mutations, obs) => {
          if (container.scrollHeight > container.clientHeight) {
            applyScroll(container);
            obs.disconnect();
          }
        });

        observer.observe(container, { childList: true, subtree: true });

        return () => {
          observer.disconnect();
        };
      }
    }
  }, [cachedData, restoreState, getScrollContainer]);

  // 此 Effect 负责在恢复完成后，自动将 isRestoring 置为 false，从而“解锁”页面
  useEffect(() => {
    if (isRestoring) {
      // 延迟解锁，确保页面的恢复性渲染已完成
      const timer = setTimeout(() => {
        
        setIsRestoring(false);
      }, 150); // 延迟应略长于滚动恢复的延迟
      return () => clearTimeout(timer);
    }
  }, [isRestoring]);

  const saveScrollState = useCallback(() => {
    const container = getScrollContainer();
    if (!container || !dataRef.current) return;

    const cache: ScrollCacheData = {
      scrollPosition: container.scrollTop,
      ...dataRef.current,
      timestamp: Date.now(),
    };

    
    setScrollCache(pathname, cache);
  }, [pathname, getScrollContainer, dataRef]);

  return { saveScrollState, isRestoring };
};

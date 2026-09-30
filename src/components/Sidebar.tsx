/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Baby, Twitter, CircleEllipsis, Drama, Clapperboard, Home, Tv } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  ElementType,
  useContext,
  useEffect,
  useState,
} from 'react';

import { clearScrollCache } from '@/lib/scrollCache';
import { useSite } from './SiteProvider';

interface SidebarContextType {}

const SidebarContext = createContext<SidebarContextType>({});

export const useSidebar = () => useContext(SidebarContext);

interface MenuItem {
  icon: ElementType;
  label: string;
  href: string;
  onClick?: () => void;
}

// 可替换为你自己的 logo 图片
const Logo = () => {
  const { siteName } = useSite();
  return (
    <Link
      href='/'
      className='flex items-center justify-center h-16 select-none hover:opacity-80 transition-opacity duration-200'
    >
      <span className='text-2xl font-bold text-blue-400 tracking-tight'>
        {siteName}
      </span>
    </Link>
  );
};

interface SidebarProps {
  activePath?: string;
  isTabletMode?: boolean; // 新增属性
  onCategorySelect?: () => void; // 新增属性
}



const Sidebar = ({ activePath = '/', isTabletMode = false, onCategorySelect }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 若同一次 SPA 会话中已经读取过折叠状态，则直接复用，避免闪烁
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  

  

  const [active, setActive] = useState(activePath);

  useEffect(() => {
    // 优先使用传入的 activePath
    if (activePath) {
      setActive(activePath);
    } else {
      // 否则使用当前路径
      const getCurrentFullPath = () => {
        const queryString = searchParams.toString();
        return queryString ? `${pathname}?${queryString}` : pathname;
      };
      const fullPath = getCurrentFullPath();
      setActive(fullPath);
    }
  }, [activePath, pathname, searchParams]);

  

  const handleSearchClick = () => {
    router.push('/search');
  };

  const contextValue = {};

  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    {
      icon: Clapperboard,
      label: '电影',
      href: '/douban?type=movie',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv',
    },
    {
      icon: Twitter,
      label: '动漫',
      href: '/douban?type=anime',
    },
    {
      icon: Drama,
      label: '综艺',
      href: '/douban?type=show',
    },
    {
      icon: Baby,
      label: '儿童',
      href: '/douban?type=child',
    },
  ]);

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setMenuItems((prevItems) => [
        ...prevItems,
        {
          icon: CircleEllipsis,
          label: '更多',
          href: '/douban?type=custom',
        },
      ]);
    }
  }, []);

  const handleMenuClick = (href: string) => {
    const targetPathname = href.split('?')[0];
    if (targetPathname) {
      clearScrollCache(targetPathname);
    }
    window.dispatchEvent(new CustomEvent('clearHomepageScroll'));
    setActive(href);
    onCategorySelect?.();
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {/* 在移动端隐藏侧边栏 */}
      <div className='hidden md:flex'>
        <aside
          data-sidebar
          className={`fixed top-0 left-0 h-screen bg-white/40 backdrop-blur-xl transition-all duration-300 border-r border-gray-200/50 z-10 shadow-lg dark:bg-gray-900/70 dark:border-gray-700/50 pt-[env(safe-area-inset-top)] w-64`}
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className='flex h-full flex-col'>
            {/* 顶部 Logo 区域 */}
            <div className='relative h-16'>
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                  isCollapsed ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <div className='w-[calc(100%-4rem)] flex justify-center'>
                  {!isCollapsed && <Logo />}
                </div>
              </div>
              
            </div>

            {/* 导航 */}
            <nav className='flex-1 overflow-y-auto px-2 mt-4 space-y-1'>
              {[
                {
                  icon: Home,
                  label: '首页',
                  href: '/',
                  onClick: () => {
                    setActive('/');
                    window.dispatchEvent(new CustomEvent('clearHomepageScroll'));
                  }
                },
                ...menuItems
              ].map((item) => {
                const typeMatch = item.href.match(/type=([^&]+)/)?.[1];
                const decodedActive = decodeURIComponent(active);
                const decodedItemHref = decodeURIComponent(item.href);
                const isActive =
                  item.href === '/'
                    ? active === '/'
                    : decodedActive === decodedItemHref ||
                      (decodedActive.startsWith('/douban') &&
                        decodedActive.includes(`type=${typeMatch}`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => item.onClick ? item.onClick() : handleMenuClick(item.href)}
                    data-active={isActive}
                    className={`group flex items-center rounded-lg px-2 py-2 pl-4 text-gray-700 hover:bg-gray-100/30 hover:text-blue-400 data-[active=true]:bg-blue-400/20 data-[active=true]:text-blue-500 font-medium transition-colors duration-200 min-h-[40px] dark:text-gray-300 dark:hover:text-blue-300 dark:data-[active=true]:bg-blue-400/10 dark:data-[active=true]:text-blue-300 ${
                      isCollapsed ? 'w-full max-w-none mx-0' : 'mx-0'
                    } gap-3 justify-start`}
                  >
                    <div className='w-4 h-4 flex items-center justify-center'>
                      <Icon className='h-4 w-4 text-gray-500 group-hover:text-blue-400 data-[active=true]:text-white dark:text-gray-400 dark:group-hover:text-blue-300 dark:data-[active=true]:text-white' />
                    </div>
                    <span className='whitespace-nowrap transition-opacity duration-200 opacity-100'>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div
          className={`transition-all duration-300 sidebar-offset w-64`}
        ></div>
      </div>
    </SidebarContext.Provider>
  );
};

export default Sidebar;

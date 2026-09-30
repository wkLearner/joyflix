/* eslint-disable no-console,react-hooks/exhaustive-deps,@typescript-eslint/no-explicit-any */

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { GetBangumiCalendarData } from '@/lib/bangumi.client';
import { getChildrenShelf, getDoubanCategories, getDoubanList, getDoubanRecommends } from '@/lib/douban.client';
import { getScrollCache, clearScrollCache } from '@/lib/scrollCache';
import { DoubanItem, DoubanResult } from '@/lib/types';
import { RestorableData, useScrollRestoration } from '@/lib/useScrollRestoration';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import DoubanCustomSelector from '@/components/DoubanCustomSelector';
import DoubanSelector from '@/components/DoubanSelector';
import PageLayout from '@/components/PageLayout';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';
import { useIsTablet } from '@/lib/useIsTablet';

interface Snapshot {
  type: string;
  primarySelection: string;
  secondarySelection: string;
  multiLevelSelection: Record<string, string>;
  selectedWeekday: string;
  currentPage: number;
}

function DoubanPageClient() {
  const { mainContainerRef } = useSite();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const isTablet = useIsTablet();
  const type = searchParams.get('type') || 'movie';

  const [doubanData, setDoubanData] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectorsReady, setSelectorsReady] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const [customCategories, setCustomCategories] = useState<Array<{ name: string; type: 'movie' | 'tv'; query: string }>>([]);
  const [primarySelection, setPrimarySelection] = useState<string>('');
  const [secondarySelection, setSecondarySelection] = useState<string>('');
  const [multiLevelValues, setMultiLevelValues] = useState<Record<string, string>>({});
  const [selectedWeekday, setSelectedWeekday] = useState<string>('');

  // --- 滚动恢复逻辑 ---
  const scrollDataRef = useRef<RestorableData>({} as RestorableData);

  useEffect(() => {
    scrollDataRef.current = {
      items: doubanData,
      hasNextPage: hasMore,
      primarySelection,
      secondarySelection,
      multiLevelValues,
      selectedWeekday,
    };
  }, [doubanData, hasMore, primarySelection, secondarySelection, multiLevelValues, selectedWeekday]);

  const restoreState = useCallback((data: RestorableData) => {
    setPrimarySelection(data.primarySelection);
    setSecondarySelection(data.secondarySelection);
    setMultiLevelValues(data.multiLevelValues);
    setSelectedWeekday(data.selectedWeekday);
    setDoubanData(data.items);
    setHasMore(data.hasNextPage);
    const restoredPage = Math.ceil(data.items.length / 25) - 1;
    setCurrentPage(restoredPage > 0 ? restoredPage : 0);
    setLoading(false);
    setSelectorsReady(true);
  }, []);

  const { saveScrollState, isRestoring } = useScrollRestoration({
    mainContainerRef,
    dataRef: scrollDataRef,
    restoreState,
  });
  // --- 滚动恢复逻辑结束 ---

  const currentParamsRef = useRef<Snapshot>({} as Snapshot);

  useEffect(() => {
    currentParamsRef.current = {
      type,
      primarySelection,
      secondarySelection,
      multiLevelSelection: multiLevelValues,
      selectedWeekday,
      currentPage,
    };
  }, [type, primarySelection, secondarySelection, multiLevelValues, selectedWeekday, currentPage]);

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setCustomCategories(runtimeConfig.CUSTOM_CATEGORIES);
    }
  }, []);

  // 根据 type 初始化筛选器 (仅在非恢复状态下)
  useEffect(() => {
    if (isRestoring) return;

    const cachedData = getScrollCache(pathname);
    if (cachedData) return;

    setSelectorsReady(false);
    if (type === 'custom' && customCategories.length > 0) {
      const types = Array.from(new Set(customCategories.map((cat) => cat.type)));
      if (types.length > 0) {
        let selectedType = types.includes('movie') ? 'movie' : types[0];
        setPrimarySelection(selectedType);
        const firstCategory = customCategories.find((cat) => cat.type === selectedType);
        if (firstCategory) setSecondarySelection(firstCategory.query);
      }
    } else {
      if (type === 'movie') { setPrimarySelection('热门'); setSecondarySelection('全部'); }
      else if (type === 'tv') { setPrimarySelection(''); setSecondarySelection('tv'); }
      else if (type === 'show') { setPrimarySelection(''); setSecondarySelection('show'); }
      else if (type === 'anime') { setPrimarySelection('每日放送'); setSecondarySelection('全部'); }
      else if (type === 'child') { setPrimarySelection('全部'); setSecondarySelection(''); }
      else { setPrimarySelection(''); setSecondarySelection('全部'); }
    }
    setMultiLevelValues({ type: 'all', region: 'all', year: 'all', platform: 'all', label: 'all', sort: 'T' });
    const timer = setTimeout(() => setSelectorsReady(true), 50);
    return () => clearTimeout(timer);
  }, [type, customCategories, pathname]);

  // 当路由的 type 变化时，清除缓存
  useEffect(() => {
    if (isRestoring) return;
    clearScrollCache(pathname);
    setLoading(true);
  }, [type, pathname]);

  const skeletonData = Array.from({ length: 25 }, (_, index) => index);

  const isSnapshotEqual = useCallback((snap1: Snapshot, snap2: Snapshot) => {
    return (
      snap1.type === snap2.type &&
      snap1.primarySelection === snap2.primarySelection &&
      snap1.secondarySelection === snap2.secondarySelection &&
      snap1.selectedWeekday === snap2.selectedWeekday &&
      snap1.currentPage === snap2.currentPage &&
      JSON.stringify(snap1.multiLevelSelection) === JSON.stringify(snap2.multiLevelSelection)
    );
  }, []);

  const getRequestParams = useCallback((pageStart: number) => {
    if (type === 'tv' || type === 'show') {
      return { kind: 'tv' as const, category: type, type: secondarySelection, pageLimit: 25, pageStart };
    }
    return { kind: type as 'tv' | 'movie', category: primarySelection, type: secondarySelection, pageLimit: 25, pageStart };
  }, [type, primarySelection, secondarySelection]);

  const loadInitialData = useCallback(async () => {
    const requestSnapshot = { type, primarySelection, secondarySelection, multiLevelSelection: multiLevelValues, selectedWeekday, currentPage: 0 };
    setLoading(true);
    setDoubanData([]);
    setCurrentPage(0);
    setHasMore(true);
    setIsLoadingMore(false);
    try {
      let data: DoubanResult;
      if (type === 'custom') {
        const selectedCategory = customCategories.find((cat) => cat.type === primarySelection && cat.query === secondarySelection);
        if (selectedCategory) {
          data = await getDoubanList({ tag: selectedCategory.query, type: selectedCategory.type, pageLimit: 25, pageStart: 0 });
        } else { throw new Error('没有找到对应的分类'); }
      } else if (type === 'child') {
        data = await getChildrenShelf(primarySelection || '全部');
      } else if (type === 'anime' && primarySelection === '每日放送') {
        const calendarData = await GetBangumiCalendarData();
        const weekdayData = calendarData.find((item) => item.weekday.en === selectedWeekday);
        if (weekdayData) {
          data = { code: 200, message: 'success', list: weekdayData.items.map((item) => ({ id: item.id?.toString() || '', title: item.name_cn || item.name, poster: item.images?.large || item.images?.common || '', rate: item.rating?.score?.toString() || '', year: item.air_date?.split('-')?.[0] || '' })) };
        } else { throw new Error('没有找到对应的日期'); }
      } else if (type === 'anime') {
        data = await getDoubanRecommends({ kind: primarySelection === '番剧' ? 'tv' : 'movie', pageLimit: 25, pageStart: 0, category: '动画', format: primarySelection === '番剧' ? '电视剧' : '', region: multiLevelValues.region as string || '', year: multiLevelValues.year as string || '', platform: multiLevelValues.platform as string || '', sort: multiLevelValues.sort as string || '', label: multiLevelValues.label as string || '' });
      } else if (primarySelection === '全部') {
        data = await getDoubanRecommends({ kind: type === 'show' ? 'tv' : (type as 'tv' | 'movie'), pageLimit: 25, pageStart: 0, category: multiLevelValues.type as string || '', format: type === 'show' ? '综艺' : type === 'tv' ? '电视剧' : '', region: multiLevelValues.region as string || '', year: multiLevelValues.year as string || '', platform: multiLevelValues.platform as string || '', sort: multiLevelValues.sort as string || '', label: multiLevelValues.label as string || '' });
      } else {
        data = await getDoubanCategories(getRequestParams(0));
      }
        if (data.code === 200) {
        if (isSnapshotEqual(requestSnapshot, { ...currentParamsRef.current })) {
          setDoubanData(data.list);
          setHasMore(type === 'child' ? false : data.list.length !== 0);
        }
      } else { throw new Error(data.message || '获取数据失败'); }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [type, primarySelection, secondarySelection, multiLevelValues, selectedWeekday, getRequestParams, customCategories, isSnapshotEqual]);

  // 加载初始数据 (仅在非恢复状态下)
  useEffect(() => {
    if (isRestoring || !selectorsReady) return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => loadInitialData(), 100);
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [selectorsReady, type, primarySelection, secondarySelection, multiLevelValues, selectedWeekday, loadInitialData]);

  // 筛选条件变化时回到顶部 (仅在非恢复状态下)
  useEffect(() => {
    if (isRestoring) return;
    if (mainContainerRef?.current) {
      mainContainerRef.current.scrollTop = 0;
    }
  }, [type, primarySelection, secondarySelection, multiLevelValues, selectedWeekday, mainContainerRef]);

  // 加载更多数据 (仅在非恢复状态下)
  useEffect(() => {
    if (isRestoring || currentPage === 0) return;
    
    const fetchMoreData = async () => {
      const requestSnapshot = { type, primarySelection, secondarySelection, multiLevelSelection: multiLevelValues, selectedWeekday, currentPage };
      setIsLoadingMore(true);
      try {
        let data: DoubanResult;
        if (type === 'custom') {
          const selectedCategory = customCategories.find((cat) => cat.type === primarySelection && cat.query === secondarySelection);
          if (selectedCategory) {
            data = await getDoubanList({ tag: selectedCategory.query, type: selectedCategory.type, pageLimit: 25, pageStart: currentPage * 25 });
          } else { throw new Error('没有找到对应的分类'); }
        } else if (type === 'child') {
          data = { code: 200, message: 'success', list: [] };
        } else if (type === 'anime' && primarySelection === '每日放送') {
          data = { code: 200, message: 'success', list: [] };
        } else if (type === 'anime') {
          data = await getDoubanRecommends({ kind: primarySelection === '番剧' ? 'tv' : 'movie', pageLimit: 25, pageStart: currentPage * 25, category: '动画', format: primarySelection === '番剧' ? '电视剧' : '', region: multiLevelValues.region as string || '', year: multiLevelValues.year as string || '', platform: multiLevelValues.platform as string || '', sort: multiLevelValues.sort as string || '', label: multiLevelValues.label as string || '' });
        } else if (primarySelection === '全部') {
          data = await getDoubanRecommends({ kind: type === 'show' ? 'tv' : (type as 'tv' | 'movie'), pageLimit: 25, pageStart: currentPage * 25, category: multiLevelValues.type as string || '', format: type === 'show' ? '综艺' : type === 'tv' ? '电视剧' : '', region: multiLevelValues.region as string || '', year: multiLevelValues.year as string || '', platform: multiLevelValues.platform as string || '', sort: multiLevelValues.sort as string || '', label: multiLevelValues.label as string || '' });
        } else {
          data = await getDoubanCategories(getRequestParams(currentPage * 25));
        }
        if (data.code === 200) {
          if (isSnapshotEqual(requestSnapshot, { ...currentParamsRef.current })) {
            setDoubanData((prev) => [...prev, ...data.list]);
            setHasMore(data.list.length !== 0);
          }
        } else { throw new Error(data.message || '获取数据失败'); }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingMore(false);
      }
    };
    fetchMoreData();
  }, [currentPage, type, primarySelection, secondarySelection, customCategories, multiLevelValues, selectedWeekday, getRequestParams, isSnapshotEqual]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 设置滚动监听 (仅在非恢复状态下)
  useEffect(() => {
    if (isRestoring || !hasMore || isLoadingMore || loading || !loadingRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { root: isDesktop ? mainContainerRef?.current : document.body, rootMargin: '100% 0px', threshold: 0.1 }
    );
    observer.observe(loadingRef.current);
    observerRef.current = observer;
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [hasMore, isLoadingMore, loading, mainContainerRef, isDesktop, isRestoring]);

  const handleSelectionChange = useCallback(() => {
    clearScrollCache(pathname);
    setLoading(true);
    setCurrentPage(0);
    setDoubanData([]);
    setHasMore(true);
    setIsLoadingMore(false);
  }, [pathname]);

  const handlePrimaryChange = useCallback((value: string) => {
    if (value !== primarySelection) {
      handleSelectionChange();
      setMultiLevelValues({ type: 'all', region: 'all', year: 'all', platform: 'all', label: 'all', sort: 'T' });
      if (type === 'custom' && customCategories.length > 0) {
        const firstCategory = customCategories.find((cat) => cat.type === value);
        setPrimarySelection(value);
        if (firstCategory) setSecondarySelection(firstCategory.query);
      } else if ((type === 'tv' || type === 'show') && value === '最近热门') {
        setPrimarySelection(value);
        if (type === 'tv') setSecondarySelection('tv');
        else if (type === 'show') setSecondarySelection('show');
      } else {
        setPrimarySelection(value);
      }
    }
  }, [primarySelection, type, customCategories, handleSelectionChange]);

  const handleSecondaryChange = useCallback((value: string) => {
    if (value !== secondarySelection) {
      handleSelectionChange();
      setSecondarySelection(value);
    }
  }, [secondarySelection, handleSelectionChange]);

  const handleMultiLevelChange = useCallback((values: Record<string, string>) => {
    if (JSON.stringify(values) !== JSON.stringify(multiLevelValues)) {
      handleSelectionChange();
      setMultiLevelValues(values);
    }
  }, [multiLevelValues, handleSelectionChange]);

  const handleWeekdayChange = useCallback((weekday: string) => {
    handleSelectionChange();
    setSelectedWeekday(weekday);
  }, [handleSelectionChange]);

  const getPageTitle = () => (type === 'movie' ? '电影' : type === 'tv' ? '电视剧' : type === 'anime' ? '动漫' : type === 'show' ? '综艺' : type === 'child' ? '儿童' : '更多');

  

  const getActivePath = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    return `/douban${params.toString() ? `?${params.toString()}` : ''}`;
  };

  return (
    <PageLayout activePath={getActivePath()} title={getPageTitle()}>
      <div className="px-4 sm:px-10 py-4 sm:py-8 overflow-visible sm:pt-[4.625rem]">
        <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6 sm:pt-6">
          <div className='bg-gray-50/60 dark:bg-gray-800/40 rounded-2xl p-4 sm:p-6 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm'>
            {type !== 'custom' ? (
              <DoubanSelector type={type as 'movie' | 'tv' | 'show' | 'anime' | 'child'} primarySelection={primarySelection} secondarySelection={secondarySelection} onPrimaryChange={handlePrimaryChange} onSecondaryChange={handleSecondaryChange} onMultiLevelChange={handleMultiLevelChange} onWeekdayChange={handleWeekdayChange} />
            ) : (
              <DoubanCustomSelector customCategories={customCategories} primarySelection={primarySelection} secondarySelection={secondarySelection} onPrimaryChange={handlePrimaryChange} onSecondaryChange={handleSecondaryChange} />
            )}
          </div>
        </div>
        <div className='max-w-[96%] mx-auto mt-8 overflow-visible'>
          <div className='justify-start grid grid-cols-3 gap-x-2 gap-y-12 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-x-8 sm:gap-y-20'>
            {loading && !isRestoring ?
              skeletonData.map((index) => <DoubanCardSkeleton key={index} from={type === 'movie' || type === 'tv' || type === 'variety' || type === 'anime' ? type : 'other'} />) :
              doubanData.map((item, index) => (
                <VideoCard
                  key={`${item.title}-${index}`}
                  from='douban'
                  title={item.title}
                  poster={item.poster}
                  douban_id={Number(item.id)}
                  rate={item.rate}
                  year={item.year}
                  type={type === 'movie' ? 'movie' : ''}
                  isBangumi={type === 'anime' && primarySelection === '每日放送'}
                  onNavigate={saveScrollState}
                />
              ))}
          </div>
          {hasMore && !loading && (
            <div ref={loadingRef} className='flex justify-center mt-12 py-8'>
              {isLoadingMore && (
                <div className='flex items-center gap-2'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400'></div>
                  <span className='text-gray-600'>加载中...</span>
                </div>
              )}
            </div>
          )}
          {!hasMore && doubanData.length > 0 && <div className='text-center text-gray-500 py-8'>暂无更多</div>}
          {!loading && doubanData.length === 0 && !isRestoring && (
            <div className='text-center text-gray-500 py-8'>暂无相关内容</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default function DoubanPage() {
  return (
    <Suspense>
      <DoubanPageClient />
    </Suspense>
  );
}

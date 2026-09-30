export interface ChildCatalogEntry {
  /** Query sent to Douban subject search. */
  query: string;
  /**
   * Matched against the subject title with spaces removed.
   * Use the real Douban title, not a nickname Douban does not use.
   */
  titleIncludes: string;
  titleExcludes?: string[];
  year?: string;
  /** Chip on /douban?type=child. Items also appear under 全部. */
  group: string;
  /** Title must equal titleIncludes, not merely contain it. */
  exact?: boolean;
  /** Name reported when Douban has no matching subject. */
  label: string;
}

export const CHILD_FILTERS: Array<{ label: string; value: string }> = [
  { label: '全部', value: '全部' },
  { label: '蜘蛛侠', value: '蜘蛛侠' },
  { label: '布鲁伊', value: '布鲁伊' },
  { label: '汪汪队', value: '汪汪队' },
  { label: '超级飞侠', value: '超级飞侠' },
  { label: '启蒙动画', value: '启蒙动画' },
];

/**
 * Curated preschool / young-kids cartoons. Titles are the source of truth;
 * ids, posters, ratings, and years are filled from Douban at request time.
 * The 1981 Spider-Man and His Amazing Friends series is intentionally absent.
 */
export const CHILD_CATALOG: ChildCatalogEntry[] = [
  {
    query: '小蜘蛛和他的神奇小伙伴们 第一季',
    titleIncludes: '小蜘蛛和他的神奇小伙伴们第一季',
    year: '2021',
    group: '蜘蛛侠',
    label: '蜘蛛侠和他的神奇朋友们 第一季（Spidey and His Amazing Friends）',
  },
  {
    query: '蜘蛛侠与他的神奇朋友们 第二季',
    titleIncludes: '蜘蛛侠与他的神奇朋友们第二季',
    year: '2022',
    group: '蜘蛛侠',
    label: '蜘蛛侠和他的神奇朋友们 第二季（Spidey and His Amazing Friends）',
  },
  {
    query: '蜘蛛侠与他的神奇朋友们 第三季',
    titleIncludes: '蜘蛛侠与他的神奇朋友们第三季',
    year: '2024',
    group: '蜘蛛侠',
    label: '蜘蛛侠和他的神奇朋友们 第三季（Spidey and His Amazing Friends）',
  },
  {
    query: '蜘蛛侠与他的神奇朋友们 第四季',
    titleIncludes: '蜘蛛侠与他的神奇朋友们第四季',
    year: '2025',
    group: '蜘蛛侠',
    label: '蜘蛛侠和他的神奇朋友们 第四季（Spidey and His Amazing Friends）',
  },
  {
    query: '布鲁伊 第一季',
    titleIncludes: '布鲁伊第一季',
    year: '2018',
    group: '布鲁伊',
    label: '布鲁伊 第一季',
  },
  {
    query: '布鲁伊 第二季',
    titleIncludes: '布鲁伊第二季',
    year: '2020',
    group: '布鲁伊',
    label: '布鲁伊 第二季',
  },
  {
    query: '布鲁伊 第三季',
    titleIncludes: '布鲁伊第三季',
    year: '2021',
    group: '布鲁伊',
    label: '布鲁伊 第三季',
  },
  {
    query: '奶龙',
    titleIncludes: '奶龙',
    year: '2022',
    group: '启蒙动画',
    exact: true,
    label: '奶龙',
  },
  {
    query: '汪汪队立大功 第一季',
    titleIncludes: '汪汪队立大功第一季',
    year: '2013',
    group: '汪汪队',
    label: '汪汪队立大功 第一季',
  },
  {
    query: '汪汪队立大功 第二季',
    titleIncludes: '汪汪队立大功第二季',
    year: '2014',
    group: '汪汪队',
    label: '汪汪队立大功 第二季',
  },
  {
    query: '汪汪队立大功 第三季',
    titleIncludes: '汪汪队立大功第三季',
    year: '2015',
    group: '汪汪队',
    label: '汪汪队立大功 第三季',
  },
  {
    query: '超级飞侠 第一季',
    titleIncludes: '超级飞侠第一季',
    year: '2015',
    group: '超级飞侠',
    label: '超级飞侠 第一季',
  },
  {
    query: '超级飞侠 第二季',
    titleIncludes: '超级飞侠第二季',
    group: '超级飞侠',
    label: '超级飞侠 第二季',
  },
  {
    query: '超级飞侠第三季',
    titleIncludes: '超级飞侠第三季',
    year: '2017',
    group: '超级飞侠',
    label: '超级飞侠 第三季',
  },
  {
    query: '小猪佩奇 第一季',
    titleIncludes: '小猪佩奇第一季',
    year: '2004',
    group: '启蒙动画',
    label: '小猪佩奇 第一季',
  },
  {
    query: '海底小纵队 第一季',
    titleIncludes: '海底小纵队第一季',
    year: '2014',
    group: '启蒙动画',
    label: '海底小纵队 第一季',
  },
  {
    query: '熊出没',
    titleIncludes: '熊出没',
    year: '2012',
    group: '启蒙动画',
    exact: true,
    label: '熊出没',
  },
  {
    query: '萌鸡小队',
    titleIncludes: '萌鸡小队',
    year: '2016',
    group: '启蒙动画',
    exact: true,
    label: '萌鸡小队',
  },
  {
    query: '小羊肖恩 第一季',
    titleIncludes: '小羊肖恩第一季',
    year: '2007',
    group: '启蒙动画',
    label: '小羊肖恩 第一季',
  },
  {
    query: '爱探险的朵拉 第一季',
    titleIncludes: '爱探险的朵拉第一季',
    year: '2000',
    group: '启蒙动画',
    label: '爱探险的朵拉 第一季',
  },
  {
    query: '花园宝宝',
    titleIncludes: '花园宝宝',
    year: '2007',
    group: '启蒙动画',
    exact: true,
    label: '花园宝宝',
  },
  {
    query: '米奇妙妙屋 第一季',
    titleIncludes: '米奇妙妙屋第一季',
    year: '2006',
    group: '启蒙动画',
    label: '米奇妙妙屋 第一季（Mickey Mouse Clubhouse）',
  },
  {
    query: '超级小熊布迷',
    titleIncludes: '超级小熊布迷',
    year: '2017',
    group: '启蒙动画',
    exact: true,
    label: '超级小熊布迷',
  },
  {
    query: '小鸡彩虹',
    titleIncludes: '小鸡彩虹',
    year: '2016',
    group: '启蒙动画',
    exact: true,
    label: '小鸡彩虹',
  },
  {
    query: '变形警车珀利 第一季',
    titleIncludes: '变形警车珀利第一季',
    year: '2011',
    group: '启蒙动画',
    label: '变形警车珀利 第一季',
  },
  {
    query: '帮帮龙，出动！',
    titleIncludes: '帮帮龙，出动',
    year: '2015',
    group: '启蒙动画',
    label: '帮帮龙出动',
  },
  {
    query: '睡衣小英雄 第一季',
    titleIncludes: '睡衣小英雄第一季',
    year: '2015',
    group: '启蒙动画',
    label: '睡衣小英雄 第一季',
  },
  {
    query: '恐龙列车',
    titleIncludes: '恐龙列车',
    year: '2009',
    group: '启蒙动画',
    exact: true,
    label: '恐龙列车',
  },
  {
    query: '小公主苏菲亚 第一季',
    titleIncludes: '小公主苏菲亚第一季',
    year: '2013',
    group: '启蒙动画',
    label: '小公主苏菲亚 第一季',
  },
  {
    query: '彩虹宝宝',
    titleIncludes: '彩虹宝宝',
    year: '2016',
    group: '启蒙动画',
    exact: true,
    label: '彩虹宝宝',
  },
];

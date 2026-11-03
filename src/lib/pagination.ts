/**
 * Pagination Utility - تدير pagination بكفاءة
 * - بدلاً من تحميل 10,000 سجل = تحمل 50 في المرة
 * - تحميل تصاعدي عند الحاجة
 * - تقليل استهلاك الذاكرة والنطاق الترددي
 */

export interface PaginationState {
  page: number
  perPage: number
  total: number
  hasMore: boolean
  loading: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationState
}

export class PaginationManager {
  private page: number = 0
  private perPage: number
  private total: number = 0
  private loading: boolean = false

  constructor(perPage: number = 50) {
    this.perPage = perPage
  }

  /**
   * احسب offset و limit
   */
  getOffset(): number {
    return this.page * this.perPage
  }

  /**
   * احسب الصفحة التالية
   */
  getRange(): [number, number] {
    const from = this.getOffset()
    const to = from + this.perPage - 1
    return [from, to]
  }

  /**
   * انتقل للصفحة التالية
   */
  nextPage(): boolean {
    if (this.hasMore()) {
      this.page++
      return true
    }
    return false
  }

  /**
   * انتقل للصفحة السابقة
   */
  prevPage(): boolean {
    if (this.page > 0) {
      this.page--
      return true
    }
    return false
  }

  /**
   * هل هناك صفحات أخرى؟
   */
  hasMore(): boolean {
    return (this.page + 1) * this.perPage < this.total
  }

  /**
   * اضبط إجمالي الصفوف
   */
  setTotal(total: number): void {
    this.total = total
  }

  /**
   * احصل على حالة pagination الحالية
   */
  getState(): PaginationState {
    return {
      page: this.page,
      perPage: this.perPage,
      total: this.total,
      hasMore: this.hasMore(),
      loading: this.loading,
    }
  }

  /**
   * مؤشر على حالة التحميل
   */
  setLoading(loading: boolean): void {
    this.loading = loading
  }

  /**
   * امسح البيانات وأعد البدء
   */
  reset(): void {
    this.page = 0
    this.total = 0
    this.loading = false
  }

  /**
   * اذهب للصفحة المحددة
   */
  goToPage(page: number): void {
    if (page >= 0 && page * this.perPage <= this.total) {
      this.page = page
    }
  }
}

/**
 * Hook لإدارة Infinite Scroll
 */
export function useInfiniteScroll(
  fetcher: (offset: number, limit: number) => Promise<{ data: unknown[]; total: number }>,
  pageSize: number = 50
) {
  return {
    fetchPage: async (pageNum: number) => {
      const pm = new PaginationManager(pageSize)
      pm.goToPage(pageNum)
      pm.setLoading(true)
      
      try {
        const [from, to] = pm.getRange()
        const result = await fetcher(from, to - from + 1)
        pm.setTotal(result.total)
        return result.data
      } finally {
        pm.setLoading(false)
      }
    },
  }
}

export default PaginationManager

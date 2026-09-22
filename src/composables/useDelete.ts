import { confirmDelete, type DeleteOptions } from '../utils/deleteHelper';

/**
 * 删除操作组合式函数
 * 面板统一从这里拿删除入口，实际确认逻辑在 deleteHelper 的 confirmDelete。
 */
export function useDelete() {
  /**
   * 通用删除操作(自定义删除逻辑)
   * @param options 完整的删除配置
   */
  async function deleteItem(options: DeleteOptions): Promise<boolean> {
    return confirmDelete(options);
  }

  return {
    deleteItem,
  };
}

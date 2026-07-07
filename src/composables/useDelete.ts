import { confirmDelete, type DeleteOptions } from '../utils/deleteHelper';

/**
 * 删除操作组合式函数
 * 提供统一的删除对象属性、数组元素等操作
 */
export function useDelete() {
  /**
   * 删除对象的某个属性
   * @param target 目标对象
   * @param key 要删除的属性名
   * @param typeName 类型名称(用于提示)
   * @param displayName 显示名称(可选, 默认使用 key)
   * @param overrides 可选的覆盖配置
   */
  async function deleteProperty(
    target: Record<string, any>,
    key: string,
    typeName: string,
    displayName?: string,
    overrides?: Partial<Omit<DeleteOptions, 'typeName' | 'displayName' | 'onDelete'>>,
  ): Promise<boolean> {
    return confirmDelete({
      typeName,
      displayName: displayName || key,
      onDelete: () => {
        delete target[key];
      },
      ...overrides,
    });
  }

  /**
   * 删除数组中的某个元素
   * @param array 目标数组
   * @param index 要删除的索引
   * @param typeName 类型名称(用于提示)
   * @param displayName 显示名称(可选, 默认使用索引)
   * @param overrides 可选的覆盖配置
   */
  async function deleteArrayItem(
    array: any[],
    index: number,
    typeName: string,
    displayName?: string,
    overrides?: Partial<Omit<DeleteOptions, 'typeName' | 'displayName' | 'onDelete'>>,
  ): Promise<boolean> {
    return confirmDelete({
      typeName,
      displayName: displayName || `#${index + 1}`,
      onDelete: () => {
        array.splice(index, 1);
      },
      ...overrides,
    });
  }

  /**
   * 通用删除操作(自定义删除逻辑)
   * @param options 完整的删除配置
   */
  async function deleteItem(options: DeleteOptions): Promise<boolean> {
    return confirmDelete(options);
  }

  return {
    deleteProperty,
    deleteArrayItem,
    deleteItem,
  };
}

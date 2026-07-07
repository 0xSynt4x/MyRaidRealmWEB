import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useActionInputStore = defineStore('actionInput', () => {
  const inputText = ref('');

  function setInputText(text: string) {
    inputText.value = text;
  }

  function appendInputText(text: string) {
    // 如果输入框已有内容,在末尾追加换行符后再追加新文本
    if (inputText.value.trim()) {
      inputText.value = inputText.value + '\n' + text;
    } else {
      inputText.value = text;
    }
  }

  function clearInput() {
    inputText.value = '';
  }

  return {
    inputText,
    setInputText,
    appendInputText,
    clearInput,
  };
});

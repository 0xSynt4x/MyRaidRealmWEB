declare module '*ejs.min.js' {
  const ejsBrowserRuntime: {
    render(template: string, data?: Record<string, unknown>, options?: Record<string, unknown>): string;
  };

  export default ejsBrowserRuntime;
}

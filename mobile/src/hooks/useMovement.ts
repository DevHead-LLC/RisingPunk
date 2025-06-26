// Infinite loop detection
const loopDetection = new Map<string, { count: number, lastTime: number }>();
const checkForInfiniteLoop = (battalionId: string, action: string) => {
  const key = `${battalionId}-${action}`;
  const now = Date.now();
  const record = loopDetection.get(key);
  
  if (record && now - record.lastTime < 1000) {
    record.count++;
    if (record.count > 10) {
      console.log(`[INFINITE LOOP DETECTED] ${battalionId} - ${action} repeated ${record.count} times`);
      return true;
    }
  } else {
    loopDetection.set(key, { count: 1, lastTime: now });
  }
  return false;
};

export { checkForInfiniteLoop }; 
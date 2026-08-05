// Claude 아티팩트 환경의 window.storage API를 브라우저 localStorage로 재현하는 폴리필입니다.
// App.jsx는 원래 아티팩트에서 쓰던 window.storage 호출을 그대로 사용하고 있어서,
// 이 파일을 main.jsx에서 App보다 먼저 import하기만 하면 별도 코드 수정 없이 그대로 동작합니다.
//
// 주의: shared=true(온라인 매칭 초대 코드)는 실제로는 다른 사람의 브라우저와 공유되지 않고,
// "이 브라우저" 안에서만 저장/조회됩니다. 진짜로 여러 사용자 간에 공유하려면
// Supabase 같은 실제 백엔드가 필요합니다.

function fullKey(key, shared) {
  return (shared ? 'shared:' : 'local:') + key;
}

if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async get(key, shared = false) {
      try {
        const raw = window.localStorage.getItem(fullKey(key, shared));
        if (raw === null || raw === undefined) return null;
        return { key, value: raw, shared };
      } catch (e) {
        return null;
      }
    },
    async set(key, value, shared = false) {
      window.localStorage.setItem(fullKey(key, shared), value);
      return { key, value, shared };
    },
    async delete(key, shared = false) {
      window.localStorage.removeItem(fullKey(key, shared));
      return { key, deleted: true, shared };
    },
    async list(prefix = '', shared = false) {
      const p = fullKey(prefix, shared);
      const stripLen = (shared ? 'shared:' : 'local:').length;
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.indexOf(p) === 0) keys.push(k.slice(stripLen));
      }
      return { keys, prefix, shared };
    },
  };
}

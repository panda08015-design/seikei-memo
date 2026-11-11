/* Ver.0.6: native Android SQLite persistence, with one-time localStorage migration. */
(function () { 'use strict';
  const native = window.SeikeiNativeStorage;
  window.MemoStorage = {
    read: function (key) {
      if (!native) return window.localStorage.getItem(key);
      const current = native.read(key);
      if (current !== null && current !== undefined) return current;
      const legacy = window.localStorage.getItem(key);
      if (legacy !== null) {
        // Only copy valid legacy memo data; retain original until safely migrated.
        const parsed = JSON.parse(legacy);
        if (!parsed || typeof parsed.scratch !== 'string' || !Array.isArray(parsed.notes)) throw new Error('旧データが不正です');
        if (!native.write(key, legacy)) throw new Error('SQLiteへの移行に失敗しました');
      }
      return legacy;
    },
    write: function (key, value) {
      if (!native) { window.localStorage.setItem(key, value); return; }
      if (!native.write(key, value)) throw new Error('SQLiteへの保存に失敗しました');
    }
  };
})();

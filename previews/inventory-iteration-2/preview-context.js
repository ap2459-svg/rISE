(() => {
  'use strict';
  const storage = window.localStorage;
  const prefix = 'rise.preview.inventory-iteration-2:';
  const keys = () => Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k&&k.startsWith(prefix));
  const isolated = Object.freeze({
    get length(){return keys().length;},
    key(index){const k=keys()[Number(index)];return k===undefined?null:k.slice(prefix.length);},
    getItem(key){return storage.getItem(prefix+String(key));},
    setItem(key,value){storage.setItem(prefix+String(key),String(value));},
    removeItem(key){storage.removeItem(prefix+String(key));},
    clear(){keys().forEach(key=>storage.removeItem(key));}
  });
  Object.defineProperty(window,'localStorage',{configurable:true,value:isolated});
})();

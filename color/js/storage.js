window.SalpColorStorage = (() => {
  const KEYS = {
    my:"salpColorV5_myPuzzles",
    favorites:"salpColorV5_favorites",
    progress:"salpColorV5_progress",
    completed:"salpColorV5_completed"
  };

  function load(key,fallback){
    try{
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):fallback;
    }catch{
      return fallback;
    }
  }

  function save(key,value){
    localStorage.setItem(key,JSON.stringify(value));
  }

  return {KEYS,load,save};
})();

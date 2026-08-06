import { createContext, useState, useContext } from 'react';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // 찜 추가/삭제 토글 함수
  const toggleWishlist = (item) => {
    setWishlist((prev) => {
      const isExist = prev.find((i) => i.id === item.id);
      if (isExist) {
        return prev.filter((i) => i.id !== item.id); // 이미 있으면 삭제
      }
      return [...prev, item]; // 없으면 추가
    });
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlistOpen, setIsWishlistOpen }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
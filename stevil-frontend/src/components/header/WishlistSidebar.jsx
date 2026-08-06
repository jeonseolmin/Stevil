import React from 'react';
import { useWishlist } from '../../context/WishlistContext';
import './WishlistSidebar.css';

const WishlistSidebar = () => {
  const { wishlist, isWishlistOpen, setIsWishlistOpen, toggleWishlist } = useWishlist();
  return (
    <>
      <div 
        className={`sidebar-overlay ${isWishlistOpen ? 'show' : ''}`} 
        onClick={() => setIsWishlistOpen(false)}
      ></div>

      <div className={`wishlist-sidebar ${isWishlistOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>내 찜 목록</h2>
          <button className="close-btn" onClick={() => setIsWishlistOpen(false)}>✕</button>
        </div>

        <div className="sidebar-content">
          {wishlist.length === 0 ? (
            <p className="empty-msg">아직 찜한 장소가 없습니다.</p>
          ) : (
            wishlist.map((item) => (
              <div key={item.id} className="wishlist-item">
                <img src={item.img} alt={item.title} />
                <div className="item-info">
                  <h4>{item.title}</h4>
                  <p>{item.category || item.location}</p>
                </div>
                <button className="remove-btn" onClick={() => toggleWishlist(item)}>🗑️</button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default WishlistSidebar;
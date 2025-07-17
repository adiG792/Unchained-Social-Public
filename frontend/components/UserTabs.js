import React from 'react';

const tabs = [
  { key: 'posts', label: 'Posts' },
  { key: 'likes', label: 'Likes' },
  { key: 'following', label: 'Following' },
  { key: 'edit', label: 'Edit Profile' },
];

export default function UserTabs({ activeTab = 'posts', onTabChange = () => {} }) {
  return (
    <div className="flex justify-center gap-6 mb-4 border-b border-[#f5e7d6]">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`pb-2 px-2 text-lg font-semibold font-poppins transition-all
            ${activeTab === tab.key
              ? 'text-[#e48a3a] border-b-4 border-[#e48a3a]'
              : 'text-gray-500 hover:text-[#e48a3a] border-b-4 border-transparent'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
} 
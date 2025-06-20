import React, { useState } from 'react';
import { FileText, Image, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import PageEditor from '../../components/admin/cms/PageEditor';
import BannerList from '../../components/admin/cms/BannerList';
import FAQEditor from '../../components/admin/cms/FAQEditor';

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState('banners');
  const { t } = useTranslation();

  const tabs = [
    { id: 'pages', label: t('admin.content.pages', { default: 'Pages' }), icon: FileText },
    { id: 'banners', label: t('admin.content.banners', { default: 'Bannières' }), icon: Image }
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('admin.content.title', { default: 'Gestion du Contenu' })}
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm">
        {activeTab === 'pages' && <PageEditor />}
        {activeTab === 'banners' && <BannerList />}
      </div>
    </div>
  );
}
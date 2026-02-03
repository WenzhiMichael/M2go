import React from 'react';
import { useLang } from '../i18n';

function Settings() {
    const { mode, setMode, t } = useLang();

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="border-b-2 border-brand-red/10 pb-6">
                <h2 className="text-3xl font-black text-brand-red uppercase tracking-tight">
                    {t('设置', 'Settings')}
                </h2>
                <p className="mt-2 text-gray-500 font-serif italic">
                    {t('配置系统显示与偏好', 'Configure display and preferences')}
                </p>
            </div>

            <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">
                            {t('语言模式', 'Language Mode')}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {t('选择显示双语或仅英文', 'Choose bilingual or English-only display')}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="langMode"
                                value="bilingual"
                                checked={mode === 'bilingual'}
                                onChange={() => setMode('bilingual')}
                                className="h-4 w-4 text-brand-red border-gray-300 focus:ring-brand-red"
                            />
                            <div>
                                <div className="text-sm font-bold text-gray-800">
                                    {t('双语（中文 / English）', 'Bilingual (中文 / English)')}
                                </div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                                    {t('推荐', 'Recommended')}
                                </div>
                            </div>
                        </div>
                    </label>

                    <label className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="langMode"
                                value="en"
                                checked={mode === 'en'}
                                onChange={() => setMode('en')}
                                className="h-4 w-4 text-brand-red border-gray-300 focus:ring-brand-red"
                            />
                            <div>
                                <div className="text-sm font-bold text-gray-800">
                                    {t('仅英文', 'English only')}
                                </div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                                    {t('简洁', 'Minimal')}
                                </div>
                            </div>
                        </div>
                    </label>
                </div>
            </section>
        </div>
    );
}

export default Settings;


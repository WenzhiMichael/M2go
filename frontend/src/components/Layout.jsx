import Sidebar from './Sidebar';

export default function Layout({ children }) {
    return (
        <div className="bg-brand-cream text-gray-800 font-sans h-screen flex overflow-hidden selection:bg-brand-red selection:text-white">
            <Sidebar />
            <main className="flex-1 h-full overflow-y-auto custom-scrollbar relative">
                <div className="bg-gradient-premium"></div>
                {/* Subtle palm leaf decoration, kept minimal */}
                <div className="fixed top-0 right-0 w-[600px] h-[600px] palm-bg transform rotate-180 translate-x-1/3 -translate-y-1/3 z-0 opacity-[0.02]"></div>

                <header className="md:hidden bg-brand-red text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
                    <div className="font-black text-xl">M2GO</div>
                    <button className="material-symbols-outlined">menu</button>
                </header>

                <div className="relative z-10 p-6 lg:p-10 max-w-[1920px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

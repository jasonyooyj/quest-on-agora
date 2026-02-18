import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export function Footer() {
    const t = useTranslations('Footer');

    return (
        <footer className="border-t border-zinc-200 bg-zinc-50">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
                {/* 상단: 로고 및 링크 */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-8 border-b border-zinc-200">
                    <div className="flex items-center gap-3 group">
                        <Image
                            src="/logo-navbar.png"
                            alt="Agora"
                            width={40}
                            height={40}
                        />
                        <span className="font-bold text-xl text-zinc-900 tracking-tight">
                            Agora
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-zinc-500">
                        <Link
                            href="/terms"
                            className="hover:text-zinc-900 transition-colors"
                        >
                            {t('terms')}
                        </Link>
                        <Link
                            href="/privacy"
                            className="hover:text-zinc-900 transition-colors"
                        >
                            {t('privacy')}
                        </Link>
                        <a
                            href="mailto:questonkr@gmail.com"
                            className="hover:text-zinc-900 transition-colors"
                        >
                            {t('contact')}
                        </a>
                    </div>
                </div>

                {/* 하단: 사업자 정보 (토스페이먼츠 심사 필수) */}
                <div className="pt-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-500">
                        <div className="space-y-2">
                            <p>
                                <span className="text-zinc-400">{t('business.companyName')}</span>{' '}
                                <span className="text-zinc-600">스튜디오 001</span>
                            </p>
                            <p>
                                <span className="text-zinc-400">{t('business.representative')}</span>{' '}
                                <span className="text-zinc-600">유영준</span>
                            </p>
                            <p>
                                <span className="text-zinc-400">{t('business.registrationNumber')}</span>{' '}
                                <span className="text-zinc-600">899-15-02775</span>
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p>
                                <span className="text-zinc-400">{t('business.address')}</span>{' '}
                                <span className="text-zinc-600">서울특별시 마포구 월드컵로 196, B105-C29호(성산동, 대명비첸시티 오피스텔)</span>
                            </p>
                            <p>
                                <span className="text-zinc-400">{t('business.phone')}</span>{' '}
                                <span className="text-zinc-600">010-2361-2963</span>
                            </p>
                            <p>
                                <span className="text-zinc-400">{t('business.email')}</span>{' '}
                                <span className="text-zinc-600">questonkr@gmail.com</span>
                            </p>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-zinc-400">
                            © {new Date().getFullYear()} 스튜디오 001. All rights reserved.
                        </p>
                        <p className="text-xs text-zinc-400">
                            {t('business.disclaimer')}
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

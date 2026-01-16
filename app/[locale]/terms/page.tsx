import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { getTranslations } from "next-intl/server";

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Legal.Terms' });

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="max-w-4xl mx-auto px-6 py-32">
                <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-display)" }}>
                    {t('title')}
                </h1>
                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                    <p className="text-muted-foreground">
                        {t('lastUpdated')}
                    </p>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">{t('article1.title')}</h2>
                        <p>
                            {t('article1.content')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">{t('article2.title')}</h2>
                        <p>
                            1. {t('article2.content1')}<br />
                            2. {t('article2.content2')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">{t('article3.title')}</h2>
                        <p>
                            {t('article3.content')}
                        </p>
                    </section>

                    <div className="p-4 bg-muted rounded-lg mt-8">
                        <p className="text-sm text-muted-foreground">
                            {t('demoNote')}
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

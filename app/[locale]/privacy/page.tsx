import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { getTranslations } from "next-intl/server";

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params; // Ensure params is awaited
    const t = await getTranslations({ locale, namespace: 'Legal.Privacy' });

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
                        <h2 className="text-xl font-semibold mb-4">{t('purpose.title')}</h2>
                        <p>
                            {t('purpose.content')}
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                            <li>{t('purpose.items.1')}</li>
                            <li>{t('purpose.items.2')}</li>
                            <li>{t('purpose.items.3')}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">{t('items.title')}</h2>
                        <p>
                            {t('items.content')}
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                            <li>{t('items.list.required')}</li>
                            <li>{t('items.list.optional')}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">{t('retention.title')}</h2>
                        <p>
                            {t('retention.content')}
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

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="max-w-4xl mx-auto px-6 py-32">
                <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-display)" }}>
                    이용약관
                </h1>
                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                    <p className="text-muted-foreground">
                        최종 수정일: 2024년 1월 1일
                    </p>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">제1조 (목적)</h2>
                        <p>
                            본 약관은 Agora(이하 &quot;회사&quot;)가 제공하는 온라인 토론 플랫폼 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">제2조 (정의)</h2>
                        <p>
                            1. &quot;서비스&quot;라 함은 구현되는 단말기(PC, 휴대형단말기 등의 각종 유무선 장치를 포함)와 상관없이 회원이 이용할 수 있는 Agora 및 관련 제반 서비스를 의미합니다.<br />
                            2. &quot;회원&quot;이라 함은 회사의 서비스에 접속하여 본 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">제3조 (약관의 효력 및 변경)</h2>
                        <p>
                            회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다. 회사는 &quot;약관의 규제에 관한 법률&quot; 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
                        </p>
                    </section>

                    <div className="p-4 bg-muted rounded-lg mt-8">
                        <p className="text-sm text-muted-foreground">
                            * 본 약관은 데모 목적으로 작성된 예시이며, 실제 법적 효력을 갖지 않습니다.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

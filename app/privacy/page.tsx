import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="max-w-4xl mx-auto px-6 py-32">
                <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-display)" }}>
                    개인정보처리방침
                </h1>
                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                    <p className="text-muted-foreground">
                        최종 수정일: 2024년 1월 1일
                    </p>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">1. 개인정보의 처리 목적</h2>
                        <p>
                            Agora는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                            <li>회원 가입 및 관리</li>
                            <li>서비스 제공 및 개선</li>
                            <li>토론 활동 분석 및 피드백 제공</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">2. 처리하는 개인정보 항목</h2>
                        <p>
                            회사는 회원가입, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                            <li>필수항목: 이메일, 비밀번호, 이름, 소속(학교/학과)</li>
                            <li>선택항목: 프로필 사진, 자기소개</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">3. 개인정보의 파기</h2>
                        <p>
                            회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
                        </p>
                    </section>

                    <div className="p-4 bg-muted rounded-lg mt-8">
                        <p className="text-sm text-muted-foreground">
                            * 본 개인정보처리방침은 데모 목적으로 작성된 예시이며, 실제 법적 효력을 갖지 않습니다.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

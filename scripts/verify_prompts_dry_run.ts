
import { getDiscussionPromptTemplate, TOPIC_GENERATION_PROMPT } from '../lib/prompts/index';
import { PromptTemplate } from "@langchain/core/prompts";

async function verifyPrompts() {
    console.log("==========================================");
    console.log("      VERIFYING GEMINI PROMPTS DRY RUN    ");
    console.log("==========================================\n");

    // 1. Verify Discussion Prompts (Chat Route Simulation)
    console.log("--- 1. Testing Discussion Prompts ---\n");

    const modes = ['socratic', 'debate', 'balanced', 'minimal'];
    const scenarios = [
        { isStarting: true, name: "Opening Message" },
        { isStarting: false, name: "Response Message" }
    ];

    const dummyData = {
        discussionTitle: "Is AI Beneficial for Humanity?",
        description: "A debate about the long-term impact of artificial intelligence on society, economy, and ethics.",
        studentStance: "Pro (AI is beneficial)",
        history: "Student: I think AI will help cure diseases.\nAI: That's a great point. But what about job displacement?",
        input: "I believe new jobs will be created to replace old ones.",
        language: "한국어"
    };

    for (const mode of modes) {
        for (const scenario of scenarios) {
            console.log(`[Mode: ${mode.toUpperCase()} | ${scenario.name}]`);

            try {
                const promptTemplate = getDiscussionPromptTemplate(mode, scenario.isStarting);

                // For ChatPromptTemplate, we want to see the messages
                const messages = await promptTemplate.formatMessages(dummyData);

                console.log(`Preview (${messages.length} messages):`);
                messages.forEach((msg, idx) => {
                    console.log(`\n[${msg._getType().toUpperCase()}]`);
                    console.log(msg.content);
                });
                console.log("\n(end preview)\n");

                // Basic Validation
                const fullContent = messages.map(m => m.content).join("\n");
                if (!fullContent.includes(dummyData.discussionTitle)) console.error("❌ Missing Discussion Title");
                // Language check might be in system or human, so checking full content is safe
                if (!fullContent.includes(dummyData.language) && !fullContent.includes("한국어")) console.error("❌ Missing Language Instruction");

                if (scenario.isStarting) {
                    // Opening prompts check
                } else {
                    if (!fullContent.includes(dummyData.input)) console.error("❌ Missing User Input");
                }

            } catch (error) {
                console.error(`❌ Error formatting prompt for ${mode} (${scenario.name}):`, error);
            }
            console.log("-".repeat(30));
        }
    }


    // 2. Verify Topic Generation Prompt (Route Simulation)
    console.log("\n--- 2. Testing Topic Generation Prompt ---\n");

    const dummyContext = "Artificial Intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans.";

    // Using Korean locale for testing
    const userPrompt = `다음 학습 자료를 바탕으로 토론 주제를 생성해주세요:\n\n${dummyContext}\n\n한국어로 답변하세요.`;

    // Simulation of full prompt sent to Gemini
    const fullPrompt = `${TOPIC_GENERATION_PROMPT}\n\n${userPrompt}`;

    console.log("Full Topic Generation Prompt Preview:\n");
    console.log(fullPrompt);

    if (!fullPrompt.includes(TOPIC_GENERATION_PROMPT)) console.error("❌ System prompt missing");
    if (!fullPrompt.includes(dummyContext)) console.error("❌ Context missing");

    console.log("\n==========================================");
    console.log("           VERIFICATION COMPLETE          ");
    console.log("==========================================");
}

verifyPrompts().catch(console.error);

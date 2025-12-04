const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: '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'
});

async function main() {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: 'Hello' }],
            model: 'llama-3.3-70b-versatile',
        });
        console.log('Success:', chatCompletion.choices[0]?.message?.content);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();

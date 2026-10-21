import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines, Bot, ChevronDown, CircleHelp, Mic, MicOff, Send, Settings2, Sparkles, Volume2, VolumeX, X } from 'lucide-react';

type Mood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'empathetic' | 'curious';
type Message = { id: string; role: 'user' | 'assistant'; content: string; mood?: Mood };
type VoiceRecognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => VoiceRecognition; webkitSpeechRecognition?: new () => VoiceRecognition };

const starters = [
  { label: 'Kể chuyện vui', prompt: 'Kể mình nghe một chuyện vui ngắn đi.' },
  { label: 'Tâm sự chút', prompt: 'Hôm nay mình hơi mệt, nói chuyện với mình một chút nhé.' },
  { label: 'Giải thích dễ hiểu', prompt: 'Giải thích cho mình AI hoạt động như thế nào, dễ hiểu và thú vị nhé.' },
];

function detectMood(text: string): Mood {
  const s = text.toLowerCase();
  if (/buồn|mệt|stress|cô đơn|khóc|tệ quá|áp lực/.test(s)) return 'empathetic';
  if (/haha|😂|🤣|vui|đỉnh|tuyệt|hay quá|brooo/.test(s)) return 'happy';
  if (/là gì|tại sao|vì sao|thế nào|sao vậy|tò mò/.test(s)) return 'curious';
  return 'speaking';
}

function Robot({ mood }: { mood: Mood }) {
  return <motion.div className={`robot-scene mood-${mood}`} animate={{ y: mood === 'thinking' ? [0, -4, 0] : [0, -3, 0] }} transition={{ duration: mood === 'thinking' ? 2.2 : 4.2, repeat: Infinity, ease: 'easeInOut' }} aria-label={`CYAN đang ở trạng thái ${mood}`}>
    <div className="aura aura-one"/><div className="aura aura-two"/>
    <div className="orb">
      <div className="orb-shine"/><div className="orb-ring ring-one"/><div className="orb-ring ring-two"/>
      <div className="eyes">
        <motion.div className="eye" animate={mood === 'happy' ? { scaleY: .7, rotate: -4 } : mood === 'empathetic' ? { scaleY: .78, rotate: 5 } : mood === 'thinking' ? { scaleY: .72, y: 3 } : { scaleY: 1, rotate: 0, y: 0 }} transition={{ duration: .3 }}><span/></motion.div>
        <motion.div className="eye" animate={mood === 'happy' ? { scaleY: .7, rotate: 4 } : mood === 'empathetic' ? { scaleY: .78, rotate: -5 } : mood === 'thinking' ? { scaleY: .72, y: 3 } : { scaleY: 1, rotate: 0, y: 0 }} transition={{ duration: .3 }}><span/></motion.div>
      </div>
      <AnimatePresence>{mood === 'listening' && <motion.div className="listening-ripple" initial={{ opacity: 0, scale: .7 }} animate={{ opacity: [0, .7, 0], scale: [0.8, 1.2, 1.4] }} exit={{ opacity: 0 }} transition={{ duration: 1.6, repeat: Infinity }} />}</AnimatePresence>
      {mood === 'thinking' && <div className="thinking-dots"><i/><i/><i/></div>}
    </div>
    <div className="orb-shadow"/>
  </motion.div>;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'assistant', content: 'Ê, mình là CYAN ✨ Bạn muốn kể chuyện, hỏi gì đó, hay chỉ chill một chút? Mình đang nghe đây.', mood: 'happy' }]);
  const [input, setInput] = useState('');
  const [mood, setMood] = useState<Mood>('idle');
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [style, setStyle] = useState('genz');
  const [voiceError, setVoiceError] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognition = useRef<VoiceRecognition | null>(null);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); recognition.current?.stop(); }, []);

  const speak = (text: string) => {
    if (!voiceOn || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN'; utterance.rate = 1.02; utterance.pitch = 1.08;
    const voices = window.speechSynthesis.getVoices();
    const vi = voices.find(v => v.lang.toLowerCase().startsWith('vi'));
    if (vi) utterance.voice = vi;
    utterance.onstart = () => setMood('speaking');
    utterance.onend = () => setMood('idle');
    utterance.onerror = () => setMood('idle');
    window.speechSynthesis.speak(utterance);
  };

  async function sendMessage(raw: string) {
    const content = raw.trim();
    if (!content || busy) return;
    window.speechSynthesis?.cancel();
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content };
    const next = [...messages, userMessage];
    setMessages(next); setInput(''); setBusy(true); setMood('thinking'); setVoiceError('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, style, history: next.filter(m => m.id !== 'welcome').slice(-12).map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!response.ok) throw new Error(`Máy chủ trả về lỗi ${response.status}`);
      const data = await response.json() as { reply?: string; mood?: Mood; demo?: boolean };
      const reply = data.reply || 'Mình bị khựng một nhịp rồi 😅 Bạn thử nhắn lại nha.';
      const nextMood = data.mood && ['happy','empathetic','curious','speaking','idle'].includes(data.mood) ? data.mood : detectMood(reply);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply, mood: nextMood }]);
      setMood(nextMood); speak(reply);
    } catch (error) {
      // Local preview fallback: lets the interface remain testable with `npm run dev` before Pages Functions are running.
      const s = content.toLowerCase();
      let reply = `Mình nghe bạn rồi ✨ Bạn kể thêm một chút nhé, để CYAN hiểu đúng điều bạn muốn nói. (Đang ở chế độ demo local — deploy Pages Function và cấu hình AI_API_KEY để bật AI thật.)`;
      let fallbackMood: Mood = 'curious';
      if (/buồn|mệt|stress|cô đơn|khóc|áp lực/.test(s)) { reply = 'Ôi, nghe như hôm nay hơi nặng nề với bạn rồi. 🫂 Muốn kể mình nghe chuyện gì xảy ra không? Mình nghe nè. (Phản hồi demo local)'; fallbackMood = 'empathetic'; }
      else if (/xin chào|hello|chào/.test(s)) { reply = 'Ê chàooo 👋 CYAN đã online! Nay bạn thế nào?'; fallbackMood = 'happy'; }
      else if (/joke|đùa|chuyện vui|hài|cười/.test(s)) { reply = 'Wi-Fi đi khám bệnh, bác sĩ hỏi bị sao. Nó đáp: “Em mất kết nối với mọi người rồi ạ!” 📶🥲 (Mình đang ở chế độ demo local nha.)'; fallbackMood = 'happy'; }
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply, mood: fallbackMood }]);
      setMood(fallbackMood);
      setVoiceError('Đang dùng phản hồi demo local. Khi deploy Cloudflare Pages Functions và thêm AI_API_KEY, CYAN sẽ dùng AI thật.');
      void error;
    } finally { setBusy(false); }
  }

  function toggleMic() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setVoiceError('Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Bạn có thể dùng Chrome hoặc nhập tin nhắn.'); return; }
    if (listening) { recognition.current?.stop(); setListening(false); setMood('idle'); return; }
    const rec = new Recognition(); rec.lang = 'vi-VN'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (event: any) => { let transcript = ''; for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript; setInput(transcript); };
    rec.onerror = (event: any) => { setVoiceError(event.error === 'not-allowed' ? 'Bạn cần cấp quyền microphone cho trình duyệt.' : 'Mình chưa nghe rõ, bạn thử lại nhé.'); setListening(false); setMood('idle'); };
    rec.onend = () => { setListening(false); setMood('idle'); };
    recognition.current = rec; setListening(true); setMood('listening'); setVoiceError('');
    try { rec.start(); } catch { setListening(false); setMood('idle'); setVoiceError('Không thể bật microphone lúc này.'); }
  }

  function submit(e: FormEvent) { e.preventDefault(); void sendMessage(input); }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="CYAN trang chủ"><span className="brand-mark"><Bot size={19}/></span><span><strong>CYAN</strong><small>AI COMPANION</small></span></a>
      <div className="top-actions"><span className="status"><i/> HỆ THỐNG SẴN SÀNG</span><button className="icon-button" onClick={() => setShowSettings(v => !v)} aria-label="Cài đặt"><Settings2 size={19}/></button></div>
    </header>

    {showSettings && <motion.aside className="settings-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="settings-title"><strong>Cài đặt CYAN</strong><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Đóng cài đặt"><X size={17}/></button></div>
      <label htmlFor="style">Phong cách trò chuyện</label><div className="select-wrap"><select id="style" value={style} onChange={e => setStyle(e.target.value)}><option value="genz">Gen Z — thân thiện, bắt trend vừa đủ</option><option value="warm">Ấm áp — nhẹ nhàng, biết lắng nghe</option><option value="clever">Thông thái — rõ ràng, dí dỏm</option></select><ChevronDown size={16}/></div>
      <button className="setting-row" onClick={() => setVoiceOn(v => !v)}><span>{voiceOn ? <Volume2 size={17}/> : <VolumeX size={17}/>} Phản hồi bằng giọng nói</span><span className={`toggle ${voiceOn ? 'on' : ''}`}><i/></span></button>
      <p className="settings-note">Giọng nói hiện dùng tính năng có sẵn của trình duyệt. Giọng và khả năng hỗ trợ tiếng Việt tùy thiết bị.</p>
    </motion.aside>}

    <section className="hero" id="top">
      <div className="eyebrow"><Sparkles size={13}/> YOUR DIGITAL COMPANION</div>
      <h1>Một chút công nghệ.<br/><span>Thêm chút cảm xúc.</span></h1>
      <p className="hero-subtitle">Nói điều bạn nghĩ. CYAN đang lắng nghe.</p>
      <Robot mood={busy ? 'thinking' : listening ? 'listening' : mood}/>
      <div className={`state-label state-${mood}`}><span className="state-dot"/>{listening ? 'ĐANG LẮNG NGHE' : busy ? 'ĐANG SUY NGHĨ' : mood === 'speaking' ? 'ĐANG TRÒ CHUYỆN' : mood === 'happy' ? 'TÂM TRẠNG TỐT' : mood === 'empathetic' ? 'ĐANG LẮNG NGHE BẠN' : mood === 'curious' ? 'ĐANG TÒ MÒ' : 'ĐANG CHỜ BẠN'}</div>
    </section>

    <section className="chat-panel" aria-label="Cuộc trò chuyện">
      <div className="chat-heading"><div><span className="live-dot"/><strong>Cuộc trò chuyện</strong><span className="chat-caption"> · riêng tư trên phiên này</span></div><button className="clear-button" onClick={() => { setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: 'Mình đây! Bắt đầu câu chuyện mới nào ✨', mood: 'happy' }]); setMood('idle'); window.speechSynthesis?.cancel(); }}>Làm mới</button></div>
      <div className="messages">
        {messages.map((message, index) => <motion.div key={message.id} className={`message-row ${message.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .24 }}>
          {message.role === 'assistant' && <div className="message-avatar"><span/></div>}
          <div className="message-content"><div className="message-meta">{message.role === 'assistant' ? 'CYAN' : 'BẠN'}{message.role === 'assistant' && index === 0 && <span className="welcome-tag">CHÀO MỪNG</span>}</div><div className="bubble">{message.content}</div></div>
          {message.role === 'assistant' && <button className="speak-message" title="Đọc tin nhắn" onClick={() => speak(message.content)} aria-label="Đọc tin nhắn"><Volume2 size={14}/></button>}
        </motion.div>)}
        {busy && <div className="message-row assistant"><div className="message-avatar"><span/></div><div className="message-content"><div className="message-meta">CYAN</div><div className="bubble typing"><i/><i/><i/></div></div></div>}
        <div ref={messagesEnd}/>
      </div>
      {messages.length < 3 && <div className="suggestions"><span>GỢI Ý BẮT ĐẦU</span><div>{starters.map(s => <button key={s.label} onClick={() => void sendMessage(s.prompt)}>{s.label}<span>↗</span></button>)}</div></div>}
      {voiceError && <div className="inline-notice"><CircleHelp size={15}/>{voiceError}</div>}
      <form className="composer" onSubmit={submit}>
        <button type="button" className={`mic-button ${listening ? 'recording' : ''}`} onClick={toggleMic} aria-label={listening ? 'Dừng nghe' : 'Nói với CYAN'}>{listening ? <MicOff size={19}/> : <Mic size={19}/>}</button>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder={listening ? 'Mình đang nghe bạn...' : 'Nhắn gì đó cho CYAN...'} aria-label="Tin nhắn" disabled={busy}/>
        <button className="send-button" type="submit" disabled={!input.trim() || busy} aria-label="Gửi tin nhắn"><Send size={17}/></button>
      </form>
      <div className="composer-foot"><span><span className="keyboard-key">↵</span> gửi tin nhắn</span><span><AudioLines size={13}/> AI có thể mắc lỗi</span></div>
    </section>
    <footer><span>CYAN <i>●</i> ĐƯỢC THIẾT KẾ ĐỂ LẮNG NGHE</span><span>NEON SOUL / V.01</span></footer>
  </main>;
}

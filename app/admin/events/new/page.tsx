import {PageIntro} from '@/components/page-intro';
import {AdminEventForm} from '@/components/admin-event-form';
export default function NewEvent(){return <><PageIntro eyebrow="Admin / Events" title="Create an event" description="Save as a draft while details are being confirmed, or publish an approved event."/><section className="section"><div className="wrap admin-editor-wrap"><AdminEventForm/></div></section></>}

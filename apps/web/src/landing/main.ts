import '../../../../packages/ui/src/styles/tokens.css'
import './landing.css'
import { startHeroChat } from './hero-chat.js'

const log = document.querySelector<HTMLElement>('#hero-log')
const form = document.querySelector<HTMLFormElement>('#hero-form')
const input = document.querySelector<HTMLInputElement>('#hero-text')
if (log && form && input) startHeroChat({ log, form, input })

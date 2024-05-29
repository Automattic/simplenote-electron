"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[3727],{41268:function(t,e,r){var o=r(41705),i=r(96827),s=r(17243);function n(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(t);e&&(o=o.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),r.push.apply(r,o)}return r}function a(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?n(Object(r),!0).forEach((function(e){(0,o.A)(t,e,r[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):n(Object(r)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))}))}return t}var c=["content","creationDate","deleted","markdown","modificationDate","pinned","tags"];class p extends i.EventEmitter{constructor(t){var e;super(),e=this,(0,o.A)(this,"importNote",(function(t){var{isTrashed:r=!1,isMarkdown:o=!1}=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},i=(0,s.pick)(t,c);if(i.publishURL="",i.shareURL="",i.deleted=r,i.tags=(0,s.get)(i,"tags",[]),i.systemTags=(0,s.get)(i,"systemTags",[]),i.pinned&&(i.systemTags.push("pinned"),delete i.pinned),(i.markdown||o)&&(i.systemTags.push("markdown"),delete i.markdown),i.creationDate&&isNaN(i.creationDate)&&(i.creationDate=new Date(i.creationDate).getTime()/1e3),i.creationDate=i.creationDate||i.modificationDate||Date.now(),i.modificationDate=i.modificationDate||i.creationDate||Date.now(),Object.prototype.hasOwnProperty.call(i,"content")||(i.content=""),i.tags){var n=i.tags.map((t=>{var e=t.replace(/(\r\n|\n|\r|\s|,)/gm,"");return(0,s.isEmpty)(e)?void 0:e}));i.tags=n.filter((t=>void 0!==t))}e.addNote(i)})),(0,o.A)(this,"importNotes",(function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},r=arguments.length>1?arguments[1]:void 0;if((0,s.isEmpty)(t))e.emit("status","error","No notes to import.");else{if(t.activeNotes||t.trashedNotes){var o=(0,s.get)(t,"activeNotes",[]).map((t=>e.importNote(t,r))),i=(0,s.get)(t,"trashedNotes",[]).map((t=>e.importNote(t,a(a({},r),{},{isTrashed:!0}))));return Promise.all(o.concat(i))}e.emit("status","error","Invalid import format: No active or trashed notes found.")}})),this.addNote=t}}e.A=p},88379:function(t,e,r){r.r(e),r.d(e,{convertModificationDates:function(){return l}});var o=r(81515),i=r(41705),s=r(96827),n=r(41268),a=r(17243),c=["lastModified"];function p(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(t);e&&(o=o.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),r.push.apply(r,o)}return r}class d extends s.EventEmitter{constructor(t,e,r){super(),(0,i.A)(this,"importNotes",(t=>{var e=new n.A(this.addNote);if((0,a.isEmpty)(t))this.emit("status","error","No file to import.");else{var r=t[0];if((0,a.endsWith)(r.name.toLowerCase(),".json"))if(r.size>5e6)this.emit("status","error","File should be less than 5 MB.");else{var o=new FileReader;o.onload=t=>{var r=t.target.result;if(r){var o;try{o=JSON.parse(r)}catch(t){return void this.emit("status","error","Invalid json file.")}var i=o.activeNotes.length+o.trashedNotes.length,s={activeNotes:l(o.activeNotes),trashedNotes:l(o.trashedNotes)};e.importNotes(s,this.options).then((()=>{this.emit("status","complete",i),this.recordEvent("importer_import_completed",{source:"simplenote",note_count:i})}))}else this.emit("status","error","File was empty.")},o.readAsText(r)}else this.emit("status","error",'File name does not end in ".json".')}})),this.addNote=t,this.options=e,this.recordEvent=r}}function l(t){return t.map((t=>{var{lastModified:e}=t,r=(0,o.A)(t,c),s=r.modificationDate||e;s&&isNaN(s)&&(s=new Date(s).getTime()/1e3);var n=function(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?p(Object(r),!0).forEach((function(e){(0,i.A)(t,e,r[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):p(Object(r)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))}))}return t}({},r);return s&&(n.modificationDate=s),n}))}e.default=d}}]);
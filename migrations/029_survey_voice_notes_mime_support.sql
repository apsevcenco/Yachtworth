-- Yachtworth - Survey voice notes MIME support.
-- Expo/iOS can report .m4a recordings as audio/x-m4a. The backend normalizes
-- this before sending to OpenAI, but the private storage bucket should still
-- accept the original upload metadata.

update storage.buckets
   set allowed_mime_types = array[
     'audio/aac',
     'audio/mp4',
     'audio/m4a',
     'audio/x-m4a',
     'audio/mpeg',
     'audio/mp3',
     'audio/wav',
     'audio/x-wav',
     'audio/webm',
     'audio/3gpp'
   ],
       file_size_limit = 26214400
 where id = 'survey-voice-notes';

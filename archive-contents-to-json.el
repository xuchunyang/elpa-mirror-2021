;; -*- lexical-binding: t; -*-

(require 'json)

;; https://elpa.gnu.org/packages/ace-window-0.10.0.tar
(with-temp-buffer
  (insert-file-contents (car command-line-args-left))
  (goto-char (point-min))
  (let ((pkgs (mapcar (lambda (p)
                        (let ((name (car p))
                              (version (mapconcat #'number-to-string (aref (cdr p) 0) "."))
                              (type (aref (cdr p) 3)))
                          (format "%s-%s.%s" name version (if (string= "tar" type) "tar" "el"))))
		      (cdr (read (current-buffer))))))
    (write-region (json-encode-list pkgs) nil (cadr command-line-args-left))))

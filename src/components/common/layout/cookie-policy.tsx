/* eslint-disable react/no-danger */
import './cookie-policy.less';
import { useEffect, useState } from 'react';
import { postService } from '@services/post.service';
import {
  Button, Col, Row, Space
} from 'antd';

interface P {
  pId: string;
  hidden: boolean;
  onOk: () => void;
}

export default function CookiePolicy({ pId, hidden, onOk }: P) {
  const [content, setCookiePolicyContent] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const getCookiePolicyContent = async () => {
      try {
        setLoading(true);
        const resp = await postService.findById(pId);
        setCookiePolicyContent(resp.data?.content || '');
      } catch {
        setCookiePolicyContent('');
      } finally {
        setLoading(false);
      }
    };
    pId && getCookiePolicyContent();
  }, [pId]);

  if (!loading && pId && content) {
    return (
      <div className="cookie-policy-box" hidden={hidden}>
        <div className="cookie-policy-box__inner">
          <Row>
            <Col span={18}>
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </Col>
            <Col span={6}>
              <Space style={{ paddingBlock: '30px' }}>
                <Button style={{ borderRadius: '15px' }} type="primary" className="cookie-policy-box__ok" onClick={onOk}>
                  OK
                </Button>
                <Button style={{ borderRadius: '15px' }} type="default" className="cookie-policy-box__ok" onClick={onOk}>
                  Decline
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  return (
    <div className="cookie-policy-box" hidden={hidden}>
      {!loading ? (
        <div className="cookie-policy-box__inner">
          By using this website, you agree to our &nbsp;
          <a
            className="cookie-policy-box__link"
            href="/"
            target="_blank"
            rel="noreferrer"
          >
            Cookie Policy
          </a>
          . We use cookies to deliver our services. &nbsp;
          <a href="#" className="cookie-policy-box__ok" onClick={onOk}>
            OK
          </a>
          {' '}
          <a href="#" className="cookie-policy-box__ok" onClick={onOk}>
            Decline
          </a>
        </div>
      ) : (<> </>
      )}
    </div>
  );
}
